import { createHash } from "crypto";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { NextResponse } from "next/server";
import Affiliate from "@/lib/db/models/affiliate.model";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { isAdminRole } from "@/lib/dashboard-access";
import { createAffiliateCompetitionEvent } from "@/lib/affiliate-competition/events";
import {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
  ensureCurrentActivePeriod,
} from "@/lib/affiliate-competition/periods";
import { rebuildStandingsForCadence } from "@/lib/workers/affiliate-competition.worker";
import { logAffiliateCompetition } from "@/lib/affiliate-competition/logging";

const adjustSchema = z.object({
  affiliateId: z.string().min(1),
  pointsDelta: z.number().finite(),
  qualifiedRevenueDelta: z.number().finite().optional(),
  qualifiedOrdersDelta: z.number().int().optional(),
  reason: z.string().trim().min(1),
  cadence: z.enum(AFFILIATE_COMPETITION_CADENCES),
});

const buildIdempotencyKey = (payload: {
  affiliateId: string;
  cadence: AffiliateCompetitionCadence;
  pointsDelta: number;
  qualifiedRevenueDelta: number;
  qualifiedOrdersDelta: number;
  reason: string;
}) => {
  const canonical = JSON.stringify({
    affiliateId: payload.affiliateId,
    cadence: payload.cadence,
    pointsDelta: payload.pointsDelta,
    qualifiedRevenueDelta: payload.qualifiedRevenueDelta,
    qualifiedOrdersDelta: payload.qualifiedOrdersDelta,
    reason: payload.reason.trim(),
  });
  const hash = createHash("sha256").update(canonical).digest("hex");
  return `affcomp:manual:${hash}`;
};

export async function POST(req: Request) {
  try {
    const runId = randomUUID();
    const session = await getServerSession();
    if (!isAdminRole(session?.user?.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    if (!mongoose.Types.ObjectId.isValid(payload.affiliateId)) {
      return NextResponse.json(
        { success: false, message: "Invalid affiliateId" },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const affiliate = await Affiliate.findById(payload.affiliateId)
      .select("_id")
      .lean();
    if (!affiliate) {
      return NextResponse.json(
        { success: false, message: "Affiliate not found" },
        { status: 404 },
      );
    }

    const cadence = payload.cadence as AffiliateCompetitionCadence;
    const period = await ensureCurrentActivePeriod(cadence);
    const safeQualifiedRevenueDelta = Number(payload.qualifiedRevenueDelta || 0);
    const safeQualifiedOrdersDelta = Number(payload.qualifiedOrdersDelta || 0);
    const idempotencyKey = buildIdempotencyKey({
      affiliateId: payload.affiliateId,
      cadence,
      pointsDelta: payload.pointsDelta,
      qualifiedRevenueDelta: safeQualifiedRevenueDelta,
      qualifiedOrdersDelta: safeQualifiedOrdersDelta,
      reason: payload.reason,
    });

    const eventResult = await createAffiliateCompetitionEvent({
      affiliateId: payload.affiliateId,
      eventType: "manual_adjustment",
      pointsDelta: payload.pointsDelta,
      qualifiedRevenueDelta: safeQualifiedRevenueDelta,
      qualifiedOrdersDelta: safeQualifiedOrdersDelta,
      occurredAt: new Date(),
      idempotencyKey,
      metadata: {
        reason: payload.reason,
        cadence,
        periodId: period._id.toString(),
        source: "admin_adjust_api",
        adjustedByUserId: session?.user?.id || "",
      },
    });

    const standings = await rebuildStandingsForCadence(cadence, new Date(), {
      runId,
      source: "admin_adjustment",
    });

    logAffiliateCompetition("info", "manual_adjustment_applied", {
      runId,
      cadence,
      affiliateId: payload.affiliateId,
      idempotencyKey,
      created: eventResult.created,
      duplicate: eventResult.duplicate,
    });

    return NextResponse.json({
      success: true,
      runId,
      created: eventResult.created,
      duplicate: eventResult.duplicate,
      cadence,
      period: {
        id: period._id.toString(),
        startAt: period.startAt.toISOString(),
        endAt: period.endAt.toISOString(),
        status: period.status,
      },
      standings,
      idempotencyKey,
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "Failed to apply affiliate competition adjustment";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
