import { NextResponse } from "next/server";
import {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
  listPeriodsByCadence,
} from "@/lib/affiliate-competition/periods";

const asCadence = (
  value: string | null,
): AffiliateCompetitionCadence | null => {
  if (!value) return null;
  if ((AFFILIATE_COMPETITION_CADENCES as readonly string[]).includes(value)) {
    return value as AffiliateCompetitionCadence;
  }
  return null;
};

const asDate = (value: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cadence = asCadence(url.searchParams.get("cadence") || "weekly");

    if (!cadence) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid cadence. Use daily, weekly, monthly, or yearly.",
        },
        { status: 400 },
      );
    }

    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "active" || statusParam === "finalized"
        ? statusParam
        : undefined;

    const pageParam = Number(url.searchParams.get("page") || "1");
    const limitParam = Number(url.searchParams.get("limit") || "20");

    const periods = await listPeriodsByCadence({
      cadence,
      status,
      from: asDate(url.searchParams.get("from")),
      to: asDate(url.searchParams.get("to")),
      page: Number.isFinite(pageParam) ? pageParam : 1,
      limit: Number.isFinite(limitParam) ? limitParam : 20,
    });

    return NextResponse.json({
      success: true,
      cadence,
      ...periods,
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "Failed to fetch affiliate competition periods";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
