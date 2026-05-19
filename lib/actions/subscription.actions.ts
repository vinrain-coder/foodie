"use server";

import { connectToDatabase } from "@/lib/db";
import User from "@/lib/db/models/user.model";
import { getServerSession } from "@/lib/get-session";
import { revalidatePath } from "next/cache";
import { ensureWishlistIsArray } from "./wishlist.actions";

type SubscriptionPaymentPayload = {
  data: {
    metadata?: {
      userId?: string;
      plan?: "monthly" | "yearly" | string;
    };
    paid_at?: string;
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Processes a successful Paystack subscription payment.
 * Called from the Paystack verification API route.
 */
export async function processSubscriptionPayment(data: SubscriptionPaymentPayload) {
  try {
    const { metadata, paid_at } = data.data;
    const userId = metadata?.userId;
    const plan = metadata?.plan || "monthly"; // monthly or yearly

    if (!userId) throw new Error("Missing userId in subscription metadata");

    await connectToDatabase();

    // Repair corrupted wishlist data if present
    await ensureWishlistIsArray(userId);

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const expiryDate = new Date(paid_at || Date.now());
    if (plan === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      // Monthly subscription expires in exactly 30 days
      expiryDate.setDate(expiryDate.getDate() + 30);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          subscription: "PREMIUM",
          subscriptionStatus: "active",
          subscriptionExpiresAt: expiryDate,
        },
      },
      { new: true },
    );

    if (!updatedUser) throw new Error("User not found");

    revalidatePath("/coupons");
    revalidatePath("/account");

    return { success: true, message: "Subscription activated successfully", userId };
  } catch (error: unknown) {
    console.error("Error processing subscription payment:", error);
    return {
      success: false,
      message: getErrorMessage(error, "Failed to process subscription"),
    };
  }
}

export async function upgradeToPremium() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      throw new Error("You must be logged in to upgrade.");
    }

    await connectToDatabase();

    // Repair corrupted wishlist data if present
    await ensureWishlistIsArray(session.user.id);

    // MOCK: In a real app, you would verify payment with Stripe/Paystack here
    // using a transaction reference passed from the client.

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days subscription

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          subscription: "PREMIUM",
          subscriptionStatus: "active",
          subscriptionExpiresAt: expiryDate,
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new Error("User not found.");
    }

    revalidatePath("/coupons");
    revalidatePath("/account");

    // Referral System Hook Placeholder
    // TODO: if (session.user.referredBy) { await processReferralBonus(session.user.referredBy, session.user.id); }

    return {
      success: true,
      message: "Successfully upgraded to Premium!",
      user: JSON.parse(JSON.stringify(updatedUser))
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to upgrade.") };
  }
}

export async function checkSubscriptionStatus() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) return null;

    await connectToDatabase();

    // Repair corrupted wishlist data if present
    await ensureWishlistIsArray(session.user.id);

    const user = await User.findById(session.user.id);
    if (!user) return null;

    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
      // Subscription expired
      user.subscription = "FREE";
      user.subscriptionStatus = "inactive";
      await user.save();
      revalidatePath("/coupons");
    }

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return null;
  }
}
