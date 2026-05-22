import { connection } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { hitTrackingLookupLimit } from "@/lib/tracking-rate-limit";
import { getLiveTrackingSnapshotByTrackingNumber } from "@/lib/tracking/live-tracking";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> },
) {
  await connection();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";
  const limit = hitTrackingLookupLimit(ip);

  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many tracking requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  const { trackingNumber } = await params;
  const normalizedTrackingNumber = decodeURIComponent(trackingNumber)
    .trim()
    .toUpperCase();

  if (!/^TRK-[A-Z0-9-]{8,40}$/.test(normalizedTrackingNumber)) {
    return NextResponse.json({ message: "Invalid tracking number." }, { status: 400 });
  }

  const snapshot = await getLiveTrackingSnapshotByTrackingNumber(
    normalizedTrackingNumber,
    "public",
  );
  if (!snapshot) {
    return NextResponse.json({ message: "Tracking number not found." }, { status: 404 });
  }

  return NextResponse.json({
    data: snapshot,
    now: new Date().toISOString(),
  });
}
