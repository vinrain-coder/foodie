import { NextResponse } from "next/server";
import { runRiderFinanceOps } from "@/lib/workers/rider-finance.worker";

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
    const releaseLimitParam = Number(url.searchParams.get("releaseLimit") || "");
    const reconcile =
      String(url.searchParams.get("reconcile") || "true").toLowerCase() !==
      "false";

    const result = await runRiderFinanceOps({
      releaseLimit: Number.isFinite(releaseLimitParam)
        ? releaseLimitParam
        : undefined,
      reconcile,
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
        message: error?.message || "Failed to run rider finance operations",
      },
      { status: 500 },
    );
  }
}
