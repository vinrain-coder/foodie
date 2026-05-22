import { NextResponse } from "next/server";
import { processExpiredDeliveryOffers } from "@/lib/workers/rider-dispatch.worker";

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
    const limitParam = Number(url.searchParams.get("limit") || "");
    const result = await processExpiredDeliveryOffers({
      limit: Number.isFinite(limitParam) ? limitParam : undefined,
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
        message: error?.message || "Failed to process rider dispatch expiry",
      },
      { status: 500 },
    );
  }
}
