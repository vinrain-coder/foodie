import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  ensureCurrentPeriods,
  processAffiliateCompetitionRefreshQueue,
  rebuildCurrentStandings,
  rebuildStandingsForCadence,
} from "@/lib/workers/affiliate-competition.worker";
import { reconcileAffiliateCompetitionEvents } from "@/lib/affiliate-competition/reconciliation";
import {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
} from "@/lib/affiliate-competition/periods";

const isAuthorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
};

const asCadence = (
  value: string | null,
): AffiliateCompetitionCadence | null => {
  if (!value) return null;
  if ((AFFILIATE_COMPETITION_CADENCES as readonly string[]).includes(value)) {
    return value as AffiliateCompetitionCadence;
  }
  return null;
};

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const runId = randomUUID();
    const url = new URL(req.url);

    const cadenceParam = url.searchParams.get("cadence");
    const cadence = asCadence(cadenceParam);
    if (cadenceParam && !cadence) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid cadence. Use daily, weekly, monthly, or yearly.",
        },
        { status: 400 },
      );
    }
    const refreshOnly =
      String(url.searchParams.get("refreshOnly") || "false").toLowerCase() ===
      "true";
    const reconcile =
      String(url.searchParams.get("reconcile") || "false").toLowerCase() ===
      "true";

    const limitParam = Number(url.searchParams.get("limit") || "0");
    const limit = Number.isFinite(limitParam) ? Math.max(0, limitParam) : 0;

    let ensured: unknown = null;
    let rebuilt: unknown = null;

    if (!refreshOnly) {
      ensured = await ensureCurrentPeriods();
      rebuilt = cadence
        ? await rebuildStandingsForCadence(cadence, new Date(), {
            runId,
            source: "cron_ops",
          })
        : await rebuildCurrentStandings(new Date(), {
            runId,
            source: "cron_ops",
          });
    }

    const refreshed = await processAffiliateCompetitionRefreshQueue({
      runId,
      cadence: cadence || undefined,
      limit: limit > 0 ? limit : undefined,
    });

    const reconciliation = reconcile
      ? await reconcileAffiliateCompetitionEvents({
          runId,
          limit: limit > 0 ? limit : undefined,
        })
      : null;

    return NextResponse.json({
      success: true,
      runId,
      ensured,
      rebuilt,
      refreshed,
      reconciliation,
      processedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "Failed to run affiliate competition operations";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
