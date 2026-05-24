import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import AffiliateCompetitionPeriod, {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
  IAffiliateCompetitionPeriod,
} from "@/lib/db/models/affiliate-competition-period.model";
import { getAffiliateCompetitionSettings } from "@/lib/affiliate-competition/config";
import { getCurrentPeriodBounds } from "@/lib/affiliate-competition/period-boundaries";

export { AFFILIATE_COMPETITION_CADENCES, getCurrentPeriodBounds };
export type { AffiliateCompetitionCadence };

const toLeaderboardPeriod = (period: IAffiliateCompetitionPeriod) => ({
  id: period._id.toString(),
  cadence: period.cadence,
  startAt: period.startAt.toISOString(),
  endAt: period.endAt.toISOString(),
  status: period.status,
  timezone: period.timezone || "UTC",
});

export async function ensureCurrentActivePeriod(
  cadence: AffiliateCompetitionCadence,
  now: Date = new Date(),
  explicitTimeZone?: string,
): Promise<IAffiliateCompetitionPeriod> {
  await connectToDatabase();
  const timeZone =
    explicitTimeZone || (await getAffiliateCompetitionSettings()).timezone;
  const { startAt, endAt } = getCurrentPeriodBounds(cadence, now, timeZone);

  await AffiliateCompetitionPeriod.updateMany(
    {
      cadence,
      status: "active",
      endAt: { $lte: now },
    },
    { $set: { status: "finalized" } },
  );

  const period = await AffiliateCompetitionPeriod.findOneAndUpdate(
    { cadence, startAt },
    {
      $set: {
        cadence,
        startAt,
        endAt,
        status: "active",
        timezone: timeZone,
      },
      $setOnInsert: {
        timezone: timeZone,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  if (!period) {
    throw new Error(`Failed to ensure active competition period for ${cadence}`);
  }

  return period;
}

export async function getActivePeriod(
  cadence: AffiliateCompetitionCadence,
): Promise<IAffiliateCompetitionPeriod | null> {
  await connectToDatabase();
  return AffiliateCompetitionPeriod.findOne({ cadence, status: "active" }).sort({ startAt: -1 });
}

export async function getOrEnsureActivePeriod(
  cadence: AffiliateCompetitionCadence,
  now: Date = new Date(),
  timeZone?: string,
) {
  const active = await getActivePeriod(cadence);
  if (active) return active;
  return ensureCurrentActivePeriod(cadence, now, timeZone);
}

export async function getPeriodById(periodId: string) {
  if (!mongoose.Types.ObjectId.isValid(periodId)) {
    return null;
  }

  await connectToDatabase();
  return AffiliateCompetitionPeriod.findById(periodId);
}

export async function getPreviousPeriod(
  cadence: AffiliateCompetitionCadence,
  now: Date = new Date(),
) {
  await connectToDatabase();
  const current = await getOrEnsureActivePeriod(cadence, now);

  return AffiliateCompetitionPeriod.findOne({
    cadence,
    endAt: { $lte: current.startAt },
  }).sort({ endAt: -1 });
}

export async function listPeriodsByCadence(params: {
  cadence: AffiliateCompetitionCadence;
  status?: "active" | "finalized";
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) {
  await connectToDatabase();

  const page = Math.max(1, Math.floor(Number(params.page || 1)));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(params.limit || 20))));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    cadence: params.cadence,
  };

  if (params.status) {
    filter.status = params.status;
  }

  if (params.from || params.to) {
    const window: Record<string, Date> = {};
    if (params.from) window.$gte = params.from;
    if (params.to) window.$lte = params.to;
    filter.startAt = window;
  }

  const [items, total] = await Promise.all([
    AffiliateCompetitionPeriod.find(filter)
      .sort({ startAt: -1 })
      .skip(skip)
      .limit(limit),
    AffiliateCompetitionPeriod.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => toLeaderboardPeriod(item)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
