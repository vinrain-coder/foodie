import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import AffiliateCompetitionEvent from "@/lib/db/models/affiliate-competition-event.model";
import AffiliateCompetitionEntry from "@/lib/db/models/affiliate-competition-entry.model";
import AffiliateCompetitionRefreshRequest from "@/lib/db/models/affiliate-competition-refresh.model";
import {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
  ensureCurrentActivePeriod,
} from "@/lib/affiliate-competition/periods";
import { getAffiliateCompetitionSettings } from "@/lib/affiliate-competition/config";
import { logAffiliateCompetition } from "@/lib/affiliate-competition/logging";

type StandingsRow = {
  _id: mongoose.Types.ObjectId;
  points: number;
  qualifiedRevenue: number;
  qualifiedOrders: number;
  earnedEventsCount: number;
  reversedEventsCount: number;
};

const clampNonNegative = (value: number) => Math.max(0, Number(value || 0));

const evaluateEligibility = (params: {
  qualifiedOrders: number;
  minQualifiedOrders: number;
  earnedEventsCount: number;
  reversedEventsCount: number;
  refundRatioCeiling: number | null;
}) => {
  const reasons: string[] = [];

  if (params.qualifiedOrders < params.minQualifiedOrders) {
    reasons.push(`min_orders_not_met:${params.minQualifiedOrders}`);
  }

  const refundRatio =
    params.earnedEventsCount > 0
      ? params.reversedEventsCount / params.earnedEventsCount
      : 0;

  if (
    params.refundRatioCeiling !== null &&
    params.earnedEventsCount > 0 &&
    refundRatio > params.refundRatioCeiling
  ) {
    reasons.push(`refund_ratio_exceeded:${params.refundRatioCeiling}`);
  }

  return {
    eligible: reasons.length === 0,
    ineligibilityReason: reasons.length > 0 ? reasons.join(";") : undefined,
    refundRatio,
  };
};

export async function ensureCurrentPeriods(now: Date = new Date()) {
  await connectToDatabase();
  const settings = await getAffiliateCompetitionSettings();
  const periods: Record<string, string> = {};

  for (const cadence of AFFILIATE_COMPETITION_CADENCES) {
    const period = await ensureCurrentActivePeriod(cadence, now, settings.timezone);
    periods[cadence] = period._id.toString();
  }

  return {
    ensuredCadences: [...AFFILIATE_COMPETITION_CADENCES],
    periods,
    timezone: settings.timezone,
  };
}

export async function rebuildStandingsForCadence(
  cadence: AffiliateCompetitionCadence,
  now: Date = new Date(),
  options?: {
    runId?: string;
    source?: string;
  },
) {
  await connectToDatabase();

  const runId = options?.runId || randomUUID();
  const settings = await getAffiliateCompetitionSettings();
  const period = await ensureCurrentActivePeriod(cadence, now, settings.timezone);

  const aggregated = (await AffiliateCompetitionEvent.aggregate([
    {
      $match: {
        occurredAt: { $gte: period.startAt, $lt: period.endAt },
        $or: [
          { eventType: { $ne: "manual_adjustment" } },
          { eventType: "manual_adjustment", "metadata.cadence": cadence },
        ],
      },
    },
    {
      $group: {
        _id: "$affiliateId",
        points: { $sum: "$pointsDelta" },
        qualifiedRevenue: { $sum: "$qualifiedRevenueDelta" },
        qualifiedOrders: { $sum: "$qualifiedOrdersDelta" },
        earnedEventsCount: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "commission_earned"] }, 1, 0],
          },
        },
        reversedEventsCount: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "commission_reversed"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        points: { $max: [0, "$points"] },
        qualifiedRevenue: { $max: [0, "$qualifiedRevenue"] },
        qualifiedOrders: { $max: [0, "$qualifiedOrders"] },
        earnedEventsCount: { $max: [0, "$earnedEventsCount"] },
        reversedEventsCount: { $max: [0, "$reversedEventsCount"] },
      },
    },
    {
      $sort: {
        points: -1,
        qualifiedRevenue: -1,
        qualifiedOrders: -1,
        _id: 1,
      },
    },
  ])) as StandingsRow[];

  const nowAt = new Date();
  const minQualifiedOrders = settings.minQualifiedOrders[cadence] || 0;

  const rankedRows = aggregated.map((row, index) => {
    const eligibility = evaluateEligibility({
      qualifiedOrders: clampNonNegative(row.qualifiedOrders),
      minQualifiedOrders,
      earnedEventsCount: clampNonNegative(row.earnedEventsCount),
      reversedEventsCount: clampNonNegative(row.reversedEventsCount),
      refundRatioCeiling: settings.refundRatioCeiling,
    });

    return {
      periodId: period._id,
      affiliateId: row._id,
      points: clampNonNegative(row.points),
      qualifiedRevenue: clampNonNegative(row.qualifiedRevenue),
      qualifiedOrders: clampNonNegative(row.qualifiedOrders),
      rank: index + 1,
      updatedAt: nowAt,
      eligible: eligibility.eligible,
      ineligibilityReason: eligibility.ineligibilityReason,
      refundRatio: eligibility.refundRatio,
    };
  });

  if (rankedRows.length === 0) {
    const removed = await AffiliateCompetitionEntry.deleteMany({ periodId: period._id });

    const result = {
      cadence,
      periodId: period._id.toString(),
      activeWindow: {
        startAt: period.startAt.toISOString(),
        endAt: period.endAt.toISOString(),
      },
      runId,
      source: options?.source || "manual",
      timezone: settings.timezone,
      scannedRows: 0,
      upsertedRows: 0,
      removedRows: removed.deletedCount || 0,
      ineligibleRows: 0,
      minQualifiedOrders,
      refundRatioCeiling: settings.refundRatioCeiling,
    };

    logAffiliateCompetition("info", "standings_rebuilt", result);
    return result;
  }

  const staleDelete = await AffiliateCompetitionEntry.deleteMany({
    periodId: period._id,
    affiliateId: { $nin: rankedRows.map((row) => row.affiliateId) },
  });

  await AffiliateCompetitionEntry.bulkWrite(
    rankedRows.map((row) => {
      const update: Record<string, unknown> = {
        $set: row,
      };

      if (!row.ineligibilityReason) {
        update.$unset = { ineligibilityReason: "" };
      }

      return {
        updateOne: {
          filter: { periodId: row.periodId, affiliateId: row.affiliateId },
          update,
          upsert: true,
        },
      };
    }),
    { ordered: false },
  );

  const ineligibleRows = rankedRows.filter((row) => !row.eligible).length;

  const result = {
    cadence,
    periodId: period._id.toString(),
    activeWindow: {
      startAt: period.startAt.toISOString(),
      endAt: period.endAt.toISOString(),
    },
    runId,
    source: options?.source || "manual",
    timezone: settings.timezone,
    scannedRows: aggregated.length,
    upsertedRows: rankedRows.length,
    removedRows: staleDelete.deletedCount || 0,
    ineligibleRows,
    minQualifiedOrders,
    refundRatioCeiling: settings.refundRatioCeiling,
  };

  logAffiliateCompetition("info", "standings_rebuilt", result);
  return result;
}

export async function rebuildCurrentStandings(
  now: Date = new Date(),
  options?: { runId?: string; source?: string },
) {
  await connectToDatabase();

  const runId = options?.runId || randomUUID();
  const results = [];

  for (const cadence of AFFILIATE_COMPETITION_CADENCES) {
    const result = await rebuildStandingsForCadence(cadence, now, {
      runId,
      source: options?.source || "rebuild_current_standings",
    });
    results.push(result);
  }

  return {
    runId,
    cadencesProcessed: results.length,
    results,
  };
}

export async function processAffiliateCompetitionRefreshQueue(options?: {
  runId?: string;
  cadence?: AffiliateCompetitionCadence;
  limit?: number;
}) {
  await connectToDatabase();

  const runId = options?.runId || randomUUID();
  const limit = Math.max(1, Math.min(20, Number(options?.limit || 4)));

  const filter: Record<string, unknown> = { status: "pending" };
  if (options?.cadence) {
    filter.cadence = options.cadence;
  }

  const pending = await AffiliateCompetitionRefreshRequest.find(filter)
    .sort({ requestedAt: 1 })
    .limit(limit)
    .lean();

  const results: Array<Record<string, unknown>> = [];
  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    const lock = await AffiliateCompetitionRefreshRequest.findOneAndUpdate(
      {
        _id: item._id,
        status: "pending",
      },
      {
        $set: {
          status: "processing",
          lastAttemptAt: new Date(),
          error: undefined,
        },
      },
      { new: true },
    );

    if (!lock) {
      continue;
    }

    try {
      const rebuilt = await rebuildStandingsForCadence(lock.cadence, new Date(), {
        runId,
        source: "refresh_queue",
      });

      await AffiliateCompetitionRefreshRequest.findByIdAndUpdate(lock._id, {
        $set: {
          status: "completed",
          lastAttemptAt: new Date(),
          error: undefined,
        },
      });

      processed += 1;
      results.push({
        cadence: lock.cadence,
        refreshRequestId: lock._id.toString(),
        success: true,
        rebuilt,
      });
    } catch (error: unknown) {
      failed += 1;
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Refresh queue processing failed";

      await AffiliateCompetitionRefreshRequest.findByIdAndUpdate(lock._id, {
        $set: {
          status: "failed",
          lastAttemptAt: new Date(),
          error: message,
        },
      });

      logAffiliateCompetition("error", "refresh_queue_failed", {
        runId,
        cadence: lock.cadence,
        refreshRequestId: lock._id.toString(),
        error: message,
      });

      results.push({
        cadence: lock.cadence,
        refreshRequestId: lock._id.toString(),
        success: false,
        error: message,
      });
    }
  }

  const summary = {
    runId,
    requested: pending.length,
    processed,
    failed,
    results,
  };

  logAffiliateCompetition("info", "refresh_queue_processed", summary);

  return summary;
}
