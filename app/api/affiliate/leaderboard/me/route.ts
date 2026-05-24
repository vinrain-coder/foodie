import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import Affiliate from "@/lib/db/models/affiliate.model";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
} from "@/lib/affiliate-competition/periods";
import { getLeaderboardRowForAffiliate } from "@/lib/affiliate-competition/standings";

const LEADERBOARD_SCOPES = ["current", "previous", "range"] as const;
type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];

const asCadence = (
  value: string | null,
): AffiliateCompetitionCadence | null => {
  if (!value) return null;
  if (
    (AFFILIATE_COMPETITION_CADENCES as readonly string[]).includes(value)
  ) {
    return value as AffiliateCompetitionCadence;
  }
  return null;
};

const asScope = (value: string | null): LeaderboardScope => {
  if (!value) return "current";
  return (LEADERBOARD_SCOPES as readonly string[]).includes(value)
    ? (value as LeaderboardScope)
    : "current";
};

const asDate = (value: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export async function GET(req: Request) {
  try {
    const runId = randomUUID();
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const cadence = asCadence(url.searchParams.get("cadence") || "weekly");
    const scope = asScope(url.searchParams.get("scope"));
    const periodId = url.searchParams.get("periodId") || undefined;
    if (!cadence) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid cadence. Use daily, weekly, monthly, or yearly.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const affiliate = await Affiliate.findOne({ user: session.user.id })
      .select("_id")
      .lean();

    if (!affiliate?._id) {
      const leaderboard = await getLeaderboardRowForAffiliate({
        cadence,
        affiliateId: "000000000000000000000000",
        scope,
        periodId,
        from: asDate(url.searchParams.get("from")),
        to: asDate(url.searchParams.get("to")),
      });

      return NextResponse.json({
        success: true,
        runId,
        cadence,
        scope,
        period: leaderboard.period,
        periods: leaderboard.periods,
        entry: null,
      });
    }

    const leaderboard = await getLeaderboardRowForAffiliate({
      cadence,
      affiliateId: affiliate._id.toString(),
      scope,
      periodId,
      from: asDate(url.searchParams.get("from")),
      to: asDate(url.searchParams.get("to")),
    });

    return NextResponse.json({
      success: true,
      runId,
      cadence,
      scope,
      period: leaderboard.period,
      periods: leaderboard.periods,
      entry: leaderboard.entry,
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "Failed to fetch affiliate leaderboard row";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
