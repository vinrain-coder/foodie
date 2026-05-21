import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db";
import RestaurantLedgerEntry from "@/lib/db/models/restaurant-ledger-entry.model";
import { releaseMaturedPendingRestaurantBalance } from "@/lib/actions/restaurant-finance.actions";

const isAuthorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
};

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const restaurantIds = await RestaurantLedgerEntry.distinct("restaurant", {
      type: "order_capture",
      settlementState: "pending",
      availableOn: { $lte: new Date() },
    });

    let totalReleased = 0;
    let totalEntries = 0;

    for (const restaurantId of restaurantIds) {
      if (!mongoose.Types.ObjectId.isValid(String(restaurantId))) continue;
      const result = await releaseMaturedPendingRestaurantBalance(String(restaurantId));
      totalReleased += Number(result.releasedAmount || 0);
      totalEntries += Number(result.releasedEntries || 0);
    }

    return NextResponse.json({
      success: true,
      restaurantsProcessed: restaurantIds.length,
      totalReleased,
      totalEntries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed" },
      { status: 500 },
    );
  }
}
