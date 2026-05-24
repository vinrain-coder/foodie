import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import AffiliateCompetitionEntry from "@/lib/db/models/affiliate-competition-entry.model";
import Affiliate from "@/lib/db/models/affiliate.model";
import {
  AffiliateCompetitionCadence,
  getOrEnsureActivePeriod,
  getPeriodById,
  getPreviousPeriod,
  listPeriodsByCadence,
} from "@/lib/affiliate-competition/periods";

type LeaderboardScope = "current" | "previous" | "range";

type LeaderboardPeriodDoc = {
  _id: mongoose.Types.ObjectId | string;
  cadence: string;
  startAt: Date;
  endAt: Date;
  status: string;
  timezone?: string;
};

type LeaderboardEntryDoc = {
  affiliateId: mongoose.Types.ObjectId | string;
  points: number;
  qualifiedRevenue: number;
  qualifiedOrders: number;
  rank: number;
  updatedAt?: Date;
  eligible?: boolean;
  ineligibilityReason?: string;
  refundRatio?: number;
};

const toLeaderboardPeriod = (period: LeaderboardPeriodDoc) => ({
  id: period._id.toString(),
  cadence: period.cadence,
  startAt: period.startAt.toISOString(),
  endAt: period.endAt.toISOString(),
  status: period.status,
  timezone: period.timezone || "UTC",
});

const withPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

const resolveTargetPeriod = async (params: {
  cadence: AffiliateCompetitionCadence;
  scope: LeaderboardScope;
  periodId?: string;
  from?: Date;
  to?: Date;
}) => {
  if (params.periodId) {
    const byId = await getPeriodById(params.periodId);
    if (!byId) {
      return { period: null, periods: [] as ReturnType<typeof toLeaderboardPeriod>[] };
    }

    if (byId.cadence !== params.cadence) {
      return { period: null, periods: [] as ReturnType<typeof toLeaderboardPeriod>[] };
    }

    return {
      period: byId,
      periods: [toLeaderboardPeriod(byId)],
    };
  }

  if (params.scope === "current") {
    const period = await getOrEnsureActivePeriod(params.cadence);
    return { period, periods: [toLeaderboardPeriod(period)] };
  }

  if (params.scope === "previous") {
    const period = await getPreviousPeriod(params.cadence);
    return {
      period,
      periods: period ? [toLeaderboardPeriod(period)] : [],
    };
  }

  const periodList = await listPeriodsByCadence({
    cadence: params.cadence,
    from: params.from,
    to: params.to,
    page: 1,
    limit: 24,
  });

  const selected = periodList.items[0];
  if (!selected) {
    return {
      period: null,
      periods: periodList.items,
    };
  }

  const period = await getPeriodById(selected.id);
  return {
    period,
    periods: periodList.items,
  };
};

const enrichLeaderboardEntries = async (entries: LeaderboardEntryDoc[]) => {
  const affiliateIds = Array.from(
    new Set(
      entries
        .map((entry) => entry.affiliateId?.toString())
        .filter(
          (value): value is string =>
            Boolean(value && mongoose.Types.ObjectId.isValid(value)),
        ),
    ),
  );

  const affiliates = await Affiliate.find({
    _id: {
      $in: affiliateIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
  })
    .select("_id affiliateCode user")
    .populate("user", "name")
    .lean();

  const affiliateMap = new Map(
    affiliates.map((affiliate) => [affiliate._id.toString(), affiliate]),
  );

  return entries.map((entry) => {
    const affiliateId = entry.affiliateId.toString();
    const affiliate = affiliateMap.get(affiliateId) as
      | {
          _id: mongoose.Types.ObjectId;
          affiliateCode?: string;
          user?: { name?: string } | null;
        }
      | undefined;

    return {
      affiliateId,
      affiliateCode: affiliate?.affiliateCode || "DELETED",
      displayName: affiliate?.user?.name || "Deleted User",
      rank: Number(entry.rank || 0),
      points: Number(entry.points || 0),
      qualifiedRevenue: Number(entry.qualifiedRevenue || 0),
      qualifiedOrders: Number(entry.qualifiedOrders || 0),
      updatedAt: entry.updatedAt?.toISOString(),
      eligible: entry.eligible !== false,
      ineligibilityReason: entry.ineligibilityReason || null,
      refundRatio: Number(entry.refundRatio || 0),
    };
  });
};

export async function getLeaderboard(params: {
  cadence: AffiliateCompetitionCadence;
  scope?: LeaderboardScope;
  periodId?: string;
  page?: number;
  limit?: number;
  from?: Date;
  to?: Date;
}) {
  await connectToDatabase();

  const scope = params.scope || "current";
  const page = Math.max(1, Math.floor(Number(params.page || 1)));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(params.limit || 50))));
  const skip = (page - 1) * limit;

  const resolved = await resolveTargetPeriod({
    cadence: params.cadence,
    scope,
    periodId: params.periodId,
    from: params.from,
    to: params.to,
  });

  if (!resolved.period) {
    return {
      period: null,
      periods: resolved.periods,
      entries: [],
      pagination: withPagination(page, limit, 0),
    };
  }

  const [rawEntries, total] = await Promise.all([
    AffiliateCompetitionEntry.find({
      periodId: resolved.period._id,
    })
      .sort({
        points: -1,
        qualifiedRevenue: -1,
        qualifiedOrders: -1,
        affiliateId: 1,
      })
      .skip(skip)
      .limit(limit)
      .select(
        "affiliateId points qualifiedRevenue qualifiedOrders rank updatedAt eligible ineligibilityReason refundRatio",
      )
      .lean(),
    AffiliateCompetitionEntry.countDocuments({ periodId: resolved.period._id }),
  ]);

  const entries = await enrichLeaderboardEntries(rawEntries as LeaderboardEntryDoc[]);

  return {
    period: toLeaderboardPeriod(resolved.period),
    periods: resolved.periods,
    entries,
    pagination: withPagination(page, limit, total),
  };
}

export async function getLeaderboardRowForAffiliate(params: {
  cadence: AffiliateCompetitionCadence;
  affiliateId: string;
  scope?: LeaderboardScope;
  periodId?: string;
  from?: Date;
  to?: Date;
}) {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(params.affiliateId)) {
    return { period: null, periods: [], entry: null };
  }

  const scope = params.scope || "current";
  const resolved = await resolveTargetPeriod({
    cadence: params.cadence,
    scope,
    periodId: params.periodId,
    from: params.from,
    to: params.to,
  });

  if (!resolved.period) {
    return { period: null, periods: resolved.periods, entry: null };
  }

  const entry = await AffiliateCompetitionEntry.findOne({
    periodId: resolved.period._id,
    affiliateId: new mongoose.Types.ObjectId(params.affiliateId),
  })
    .select(
      "affiliateId points qualifiedRevenue qualifiedOrders rank updatedAt eligible ineligibilityReason refundRatio",
    )
    .lean();

  const enriched = entry
    ? (
        await enrichLeaderboardEntries([
          entry as unknown as LeaderboardEntryDoc,
        ])
      )[0]
    : null;

  return {
    period: toLeaderboardPeriod(resolved.period),
    periods: resolved.periods,
    entry: enriched,
  };
}
