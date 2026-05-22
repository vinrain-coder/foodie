import { NextResponse } from "next/server";
import { compressRiderLocationHistory } from "@/lib/workers/rider-tracking.worker";

const isAuthorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
};

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const olderThanMinutes = Number(url.searchParams.get("olderThanMinutes") || "");
    const limit = Number(url.searchParams.get("limit") || "");

    const result = await compressRiderLocationHistory({
      olderThanMinutes: Number.isFinite(olderThanMinutes)
        ? olderThanMinutes
        : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to run rider tracking maintenance",
      },
      { status: 500 },
    );
  }
}
