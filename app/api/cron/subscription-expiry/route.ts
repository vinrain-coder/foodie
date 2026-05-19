import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/lib/db/models/user.model";

export async function GET(req: Request) {
  try {
    // Basic security check for cron
    const authHeader = req.headers.get("authorization");
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      console.error("Cron subscription-expiry: Unauthorized attempt or missing secret");
      return new Response("Unauthorized", { status: 401 });
    }

    await connectToDatabase();

    const now = new Date();

    // Find and update expired subscriptions for premium users
    const result = await User.updateMany(
      {
        subscription: "PREMIUM",
        subscriptionStatus: { $ne: "inactive" },
        subscriptionExpiresAt: { $lt: now },
      },
      {
        $set: {
          subscription: "FREE",
          subscriptionStatus: "inactive",
          subscriptionExpiresAt: null, // Clear expiry date to avoid stale data
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} expired subscriptions.`,
    });
  } catch (error: any) {
    console.error("Subscription Expiry Cron Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
