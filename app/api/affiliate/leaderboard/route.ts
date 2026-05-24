import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
} from "@/lib/affiliate-competition/periods";
import { getLeaderboard } from "@/lib/affiliate-competition/standings";

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
    const url = new URL(req.url);
    const cadence = asCadence(url.searchParams.get("cadence") || "daily");
    if (!cadence) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid cadence. Use daily, weekly, monthly, or yearly.",
        },
        { status: 400 },
      );
    }

    const scope = asScope(url.searchParams.get("scope"));
    const periodId = url.searchParams.get("periodId") || undefined;
    const pageParam = Number(url.searchParams.get("page") || "1");
    const page = Number.isFinite(pageParam) ? pageParam : 1;
    const limitParam = Number(url.searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitParam) ? limitParam : 50;

    const leaderboard = await getLeaderboard({
      cadence,
      scope,
      periodId,
      page,
      limit,
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
      entries: leaderboard.entries,
      pagination: leaderboard.pagination,
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "Failed to fetch affiliate leaderboard";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
