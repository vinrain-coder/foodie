import { NextRequest, NextResponse } from "next/server";
import { submitRiderLocationPing } from "@/lib/actions/rider.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipAddress = forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
    const response = await submitRiderLocationPing({
      lat: Number(body?.lat),
      lng: Number(body?.lng),
      speed:
        body?.speed === undefined ? undefined : Number(body.speed),
      heading:
        body?.heading === undefined ? undefined : Number(body.heading),
      battery:
        body?.battery === undefined ? undefined : Number(body.battery),
      deliveryJobId:
        typeof body?.deliveryJobId === "string" ? body.deliveryJobId : undefined,
      deviceFingerprint:
        typeof body?.deviceFingerprint === "string"
          ? body.deviceFingerprint
          : undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      ipAddress: ipAddress || undefined,
    });

    if (!response.success) {
      return NextResponse.json({ message: response.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: response.message });
  } catch {
    return NextResponse.json(
      { message: "Unable to process location update" },
      { status: 400 },
    );
  }
}
