import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-session";
import { isAdminRole } from "@/lib/dashboard-access";
import {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
} from "@/lib/affiliate-competition/periods";
import {
  ensureCurrentPeriods,
  processAffiliateCompetitionRefreshQueue,
  rebuildCurrentStandings,
  rebuildStandingsForCadence,
} from "@/lib/workers/affiliate-competition.worker";
import { reconcileAffiliateCompetitionEvents } from "@/lib/affiliate-competition/reconciliation";
import AffiliateCompetitionRefreshRequest from "@/lib/db/models/affiliate-competition-refresh.model";
import { connectToDatabase } from "@/lib/db";

const actionSchema = z.object({
  action: z.enum(["refresh", "reconcile", "process_queue"]),
  cadence: z.enum(AFFILIATE_COMPETITION_CADENCES).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getServerSession();
  if (!isAdminRole(session?.user?.role)) {
    return unauthorized();
  }

  await connectToDatabase();

  const [pending, failed, recentCompleted] = await Promise.all([
    AffiliateCompetitionRefreshRequest.countDocuments({ status: "pending" }),
    AffiliateCompetitionRefreshRequest.countDocuments({ status: "failed" }),
    AffiliateCompetitionRefreshRequest.find({ status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(8)
      .select("cadence status source requestedAt updatedAt")
      .lean(),
  ]);

  return NextResponse.json({
    success: true,
    queue: {
      pending,
      failed,
      recentCompleted: recentCompleted.map((item) => ({
        cadence: item.cadence,
        status: item.status,
        source: item.source,
        requestedAt: item.requestedAt?.toISOString(),
        updatedAt: item.updatedAt?.toISOString(),
      })),
    },
    processedAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!isAdminRole(session?.user?.role)) {
    return unauthorized();
  }

  try {
    const payload = actionSchema.safeParse(await req.json());
    if (!payload.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 },
      );
    }

    const runId = randomUUID();
    const { action, cadence, limit } = payload.data;

    if (action === "refresh") {
      const ensured = await ensureCurrentPeriods();
      const rebuilt = cadence
        ? await rebuildStandingsForCadence(cadence as AffiliateCompetitionCadence, new Date(), {
            runId,
            source: "admin_ops",
          })
        : await rebuildCurrentStandings(new Date(), {
            runId,
            source: "admin_ops",
          });

      const refreshed = await processAffiliateCompetitionRefreshQueue({
        runId,
        cadence,
        limit,
      });

      return NextResponse.json({
        success: true,
        runId,
        action,
        ensured,
        rebuilt,
        refreshed,
        processedAt: new Date().toISOString(),
      });
    }

    if (action === "reconcile") {
      const reconciliation = await reconcileAffiliateCompetitionEvents({
        runId,
        limit,
      });

      const refreshed = await processAffiliateCompetitionRefreshQueue({
        runId,
        cadence,
      });

      return NextResponse.json({
        success: true,
        runId,
        action,
        reconciliation,
        refreshed,
        processedAt: new Date().toISOString(),
      });
    }

    const refreshed = await processAffiliateCompetitionRefreshQueue({
      runId,
      cadence,
      limit,
    });

    return NextResponse.json({
      success: true,
      runId,
      action,
      refreshed,
      processedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "Failed to execute affiliate competition operation";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
