"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../db";
import StockSubscription, {
  IStockSubscription,
} from "../db/models/stock-subscription.model";
import MenuItem, { IMenuItem } from "../db/models/menu.item.model";
import type { FilterQuery } from "mongoose";
import {
  sendAdminEventNotification,
  sendStockSubscriptionNotification,
} from "@/lib/email/transactional";
import crypto from "crypto";

export interface IStockSubscriptionPopulated
  extends Omit<IStockSubscription, "menuItem"> {
  menuItem: IMenuItem;
}
import { getSetting } from "./setting.actions";
import { flattenZodErrors, escapeRegExp, normalizeDateRange } from "@/lib/utils";
import { getServerSession } from "@/lib/get-session";
import { StockSubscriptionSchema } from "../validator";
import { ActionState } from "@/types/action-state";

/**
 * Subscribe to stock notifications for a menuItem.
 */
export const subscribeToStock = async (data: {
  email: string;
  menuItemId: string;
}): Promise<ActionState> => {
  try {
    const validated = StockSubscriptionSchema.safeParse({
      email: data.email,
      menuItem: data.menuItemId,
    });

    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }

    const { email, menuItem: menuItemId } = validated.data;

    await connectToDatabase();

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) return { success: false, message: "MenuItem not found." };

    // Allow re-subscription if the previous subscription was notified
    const existingSubscription = await StockSubscription.findOne({
      email,
      menuItem: menuItemId,
      isNotified: false, // Only block active, non-notified subscriptions
    });

    if (existingSubscription)
      return {
        success: false,
        message: "You are already subscribed to this menuItem.",
      };

    const subscription = await StockSubscription.create({
      email: email.toLowerCase().trim(),
      menuItem: menuItemId,
      subscribedAt: new Date(),
      isNotified: false, // Reset notified status for new subscriptions
      unsubscribeToken: crypto.randomBytes(32).toString("hex"),
    });

    await sendAdminEventNotification({
      title: "Restock request created",
      description: `${email} asked to be notified when ${menuItem.name || "a menuItem"} is back in stock.`,
      href: "/admin/stockSubs",
      meta: "Waiting for restock",
      createdAt: (subscription.subscribedAt || new Date()).toISOString(),
    });

    revalidatePath("/admin/stockSubs");
    return { success: true, message: "Subscription successful!" };
  } catch (error) {
    console.error("Error subscribing to stock:", error);
    return { success: false, message: "An error occurred. Please try again." };
  }
};

/**
 * Fetch stock subscriptions with optional filtering.
 */
export async function getAllStockSubscriptions({
  limit,
  page,
  filter,
  query,
  from,
  to,
}: {
  limit?: number;
  page: number;
  filter?: string;
  query?: string;
  from?: string;
  to?: string;
}) {
  const {
    common: { pageSize },
  } = await getSetting();

  // Ensure limit is always a number
  limit = Number(limit ?? pageSize);

  await connectToDatabase();

  const skipAmount = (Number(page) - 1) * limit;

  // Build Filter Query
  const filterQuery: FilterQuery<IStockSubscription> = {};
  if (filter === "notified") filterQuery.isNotified = true;
  if (filter === "pending") filterQuery.isNotified = false;

  if (query) {
    const escapedQuery = escapeRegExp(query);
    // We need to find menuItems that match the query to filter by menuItem name
    const menuItems = await MenuItem.find({
      name: { $regex: escapedQuery, $options: "i" },
    }).select("_id");
    const menuItemIds = menuItems.map((p) => p._id);

    filterQuery.$or = [
      { email: { $regex: escapedQuery, $options: "i" } },
      { menuItem: { $in: menuItemIds } },
    ];
  }

  const { fromDate, toDate } = normalizeDateRange(from, to);
  if (fromDate || toDate) {
    filterQuery.subscribedAt = {};
    if (fromDate) filterQuery.subscribedAt.$gte = fromDate;
    if (toDate) filterQuery.subscribedAt.$lte = toDate;
  }

  const subscriptions = await StockSubscription.find(filterQuery)
    .populate("menuItem")
    .sort({ subscribedAt: "desc" }) // Sorting by latest subscriptions first
    .skip(skipAmount)
    .limit(limit);

  const totalSubscriptions = await StockSubscription.countDocuments(filterQuery);

  return {
    data: JSON.parse(JSON.stringify(subscriptions)),
    totalPages: Math.ceil(totalSubscriptions / limit),
  };
}

/**
 * Get stock subscription statistics.
 */
export async function getStockSubscriptionStats(params?: {
  query?: string;
  from?: string;
  to?: string;
}) {
  await connectToDatabase();
  const { query, from, to } = params || {};

  const filterQuery: FilterQuery<IStockSubscription> = {};
  if (query) {
    const escapedQuery = escapeRegExp(query);
    const menuItems = await MenuItem.find({
      name: { $regex: escapedQuery, $options: "i" },
    }).select("_id");
    const menuItemIds = menuItems.map((p) => p._id);
    filterQuery.$or = [
      { email: { $regex: escapedQuery, $options: "i" } },
      { menuItem: { $in: menuItemIds } },
    ];
  }

  const { fromDate, toDate } = normalizeDateRange(from, to);
  if (fromDate || toDate) {
    filterQuery.subscribedAt = {};
    if (fromDate) filterQuery.subscribedAt.$gte = fromDate;
    if (toDate) filterQuery.subscribedAt.$lte = toDate;
  }

  const [total, pending, notified] = await Promise.all([
    StockSubscription.countDocuments(filterQuery),
    StockSubscription.countDocuments({ ...filterQuery, isNotified: false }),
    StockSubscription.countDocuments({ ...filterQuery, isNotified: true }),
  ]);

  return {
    total,
    pending,
    notified,
  };
}

/**
 * Notify subscribers about menuItem restock.
 * Supports notifying either a specific subscription or all pending for a menuItem.
 */
export const notifySubscribers = async ({
  menuItemId,
  subscriptionId,
}: {
  menuItemId?: string;
  subscriptionId?: string;
}) => {
  try {
    const session = await getServerSession();
    if (session?.user.role !== "ADMIN") {
      return { success: false, message: "Admin permission required" };
    }

    await connectToDatabase();

    // 1. Identify subscriptions to notify
    const query: FilterQuery<IStockSubscription> = { isNotified: false };
    if (subscriptionId) {
      query._id = subscriptionId;
    } else if (menuItemId) {
      query.menuItem = menuItemId;
    } else {
      return { success: false, message: "MenuItem ID or Subscription ID is required." };
    }

    const subscriptions = (await StockSubscription.find(query).populate(
      "menuItem"
    )) as unknown as IStockSubscriptionPopulated[];

    if (subscriptions.length === 0) {
      return { success: true, message: "No pending subscriptions to notify." };
    }

    let successCount = 0;
    let failureCount = 0;

    // 2. Process notifications individually for robustness
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const menuItem = sub.menuItem; // Strong typed

        if (!menuItem) {
          throw new Error(`MenuItem not found for subscription ${sub._id}`);
        }

        if (menuItem.countInStock <= 0) {
          throw new Error(`MenuItem "${menuItem.name}" is still out of stock.`);
        }

        if (!menuItem.isPublished) {
          throw new Error(`MenuItem "${menuItem.name}" is not published.`);
        }

        // Attempt to send email
        await sendStockSubscriptionNotification(sub.email, menuItem, sub.unsubscribeToken);

        // Update specific subscription upon success
        await StockSubscription.findByIdAndUpdate(sub._id, {
          $set: { isNotified: true, notifiedAt: new Date() },
        });

        return sub.email;
      })
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        successCount++;
      } else {
        failureCount++;
        console.error("❌ Notification failed:", result.reason);
      }
    });

    revalidatePath("/admin/stockSubs");

    if (successCount > 0 && failureCount === 0) {
      return {
        success: true,
        message: `Successfully notified ${successCount} subscriber(s).`,
      };
    } else if (successCount > 0 && failureCount > 0) {
      return {
        success: true,
        message: `Notified ${successCount} subscriber(s), but ${failureCount} failed. Check logs.`,
      };
    } else {
      return {
        success: false,
        message: `Failed to notify subscribers. ${failureCount} error(s) occurred.`,
      };
    }
  } catch (error: unknown) {
    console.error("❌ Stock notification error:", error);
    const message =
      error instanceof Error ? error.message : "An error occurred.";
    return { success: false, message };
  }
};

/**
 * Delete a stock subscription.
 */
export const deleteStockSubscription = async (id: string) => {
  try {
    const session = await getServerSession();
    if (session?.user.role !== "ADMIN") {
      return { success: false, message: "Admin permission required" };
    }

    await connectToDatabase();
    const subscription = await StockSubscription.findByIdAndDelete(id);
    if (!subscription) return { success: false, message: "Subscription not found." };
    revalidatePath("/admin/stockSubs");
    return { success: true, message: "Subscription deleted successfully." };
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return { success: false, message: "An error occurred." };
  }
};

/**
 * Unsubscribe from stock notifications using a token.
 */
export const unsubscribeFromStock = async (token: string) => {
  try {
    if (!token) return { success: false, message: "Token is required." };
    await connectToDatabase();

    const result = await StockSubscription.findOneAndDelete({
      unsubscribeToken: token,
    });

    if (!result) {
      return {
        success: false,
        message: "No active subscription found or invalid token.",
      };
    }

    revalidatePath("/admin/stockSubs");
    return {
      success: true,
      message: "You have been successfully unsubscribed.",
    };
  } catch (error) {
    console.error("❌ Unsubscribe error:", error);
    return { success: false, message: "An error occurred while unsubscribing." };
  }
};
