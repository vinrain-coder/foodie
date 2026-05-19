"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../db";
import { getServerSession } from "../get-session";
import { formatCurrency, formatError } from "../utils";
import Order from "../db/models/order.model";
import Review from "../db/models/review.model";
import StockSubscription from "../db/models/stock-subscription.model";
import User from "../db/models/user.model";
import AdminNotificationState from "../db/models/admin-notification-state.model";
import SupportTicket from "../db/models/support-ticket.model";
import Affiliate from "../db/models/affiliate.model";
import AffiliatePayout from "../db/models/affiliate-payout.model";
import WalletPayout from "../db/models/wallet-payout.model";

export type AdminNotificationItem = {
  id: string;
  type: "order" | "review" | "stock-subscription" | "customer" | "support" | "affiliate" | "affiliate-payout" | "wallet-payout";
  title: string;
  description: string;
  href: string;
  createdAt: string;
  isUnread: boolean;
  meta: string;
};

export type AdminNotificationFeed = {
  unreadCount: number;
  lastSeenAt: string | null;
  items: AdminNotificationItem[];
};

type OrderNotificationSource = {
  _id: { toString(): string } | string;
  createdAt: Date | string;
  totalPrice?: number;
  isPaid?: boolean;
  items?: Array<unknown>;
  user?: {
    name?: string;
    email?: string;
  } | null;
};

type ReviewNotificationSource = {
  _id: { toString(): string } | string;
  createdAt: Date | string;
  rating: number;
  title?: string;
  isVerifiedPurchase?: boolean;
  user?: {
    name?: string;
    email?: string;
  } | null;
  menuItem?: {
    name?: string;
  } | null;
};

type StockSubscriptionNotificationSource = {
  _id: { toString(): string } | string;
  createdAt?: Date | string;
  subscribedAt?: Date | string;
  email: string;
  isNotified?: boolean;
  menuItem?: {
    name?: string;
  } | null;
};

type CustomerNotificationSource = {
  _id: { toString(): string } | string;
  createdAt: Date | string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
};
type SupportNotificationSource = {
  _id: { toString(): string } | string;
  createdAt: Date | string;
  type: "complaint" | "query" | "recommendation";
  subject: string;
  email: string;
  name: string;
  status: "open" | "replied";
};

type AffiliateNotificationSource = {
  _id: { toString(): string } | string;
  createdAt: Date | string;
  affiliateCode: string;
  status: "pending" | "approved" | "rejected";
  user?: {
    name?: string;
    email?: string;
  } | null;
};

type AffiliatePayoutNotificationSource = {
  _id: { toString(): string } | string;
  createdAt: Date | string;
  amount: number;
  status: "pending" | "processing" | "paid" | "rejected";
  paymentMethod: string;
  affiliate?: {
    affiliateCode?: string;
    user?: {
      name?: string;
      email?: string;
    } | null;
  } | { toString(): string } | string | null;
};

type WalletPayoutNotificationSource = {
  _id: { toString(): string } | string;
  createdAt: Date | string;
  amount: number;
  status: "pending" | "processing" | "paid" | "rejected";
  paymentMethod: string;
  user?: {
    name?: string;
    email?: string;
  } | null;
};

const asId = (value: { toString(): string } | string) => value.toString();
const asDate = (value: Date | string) => new Date(value).toISOString();

const getAffiliatePayoutUserName = (
  affiliate: AffiliatePayoutNotificationSource["affiliate"],
) => {
  if (!affiliate || typeof affiliate !== "object") return undefined;
  if (!("user" in affiliate)) return undefined;
  return affiliate.user?.name;
};

const ensureAdminSession = async () => {
  const session = await getServerSession();
  if (!session) throw new Error("User is not authenticated");
  if (session.user.role !== "ADMIN") throw new Error("Admin permission required");
  return session;
};

export async function getAdminNotificationFeed(
  limit = 12
): Promise<AdminNotificationFeed> {
  await connectToDatabase();
  const session = await ensureAdminSession();

  const state = await AdminNotificationState.findOne({
    adminUser: session.user.id,
  }).lean();

  const lastSeenAt = state?.lastSeenAt ? new Date(state.lastSeenAt) : null;
  const readIds = state?.readIds || [];
  const readIdsSet = new Set(readIds);

  const [orders, reviews, subscriptions, customers, supportTickets, affiliates, payouts, walletPayouts] = (await Promise.all([
    Order.find({ status: { $nin: ["cancelled", "return_requested"] } })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Review.find()
      .populate("user", "name email")
      .populate("menuItem", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    StockSubscription.find()
      .populate("menuItem", "name")
      .sort({ subscribedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    User.find({ role: { $ne: "ADMIN" } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    SupportTicket.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Affiliate.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    AffiliatePayout.find()
      .populate({
        path: "affiliate",
        populate: { path: "user", select: "name email" }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    WalletPayout.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ])) as [
    OrderNotificationSource[],
    ReviewNotificationSource[],
    StockSubscriptionNotificationSource[],
    CustomerNotificationSource[],
    SupportNotificationSource[],
    AffiliateNotificationSource[],
    AffiliatePayoutNotificationSource[],
    WalletPayoutNotificationSource[],
  ];

  const items: AdminNotificationItem[] = [
    ...orders.map((order) => {
      const id = `order-${asId(order._id)}`;
      return {
        id,
        type: "order" as const,
        title: "New order received",
        description: `${order.user?.name || "Customer"} placed an order for ${formatCurrency(order.totalPrice || 0)}${order.items?.length ? ` with ${order.items.length} item${order.items.length > 1 ? "s" : ""}` : ""}.`,
        href: `/admin/orders/${asId(order._id)}`,
        createdAt: asDate(order.createdAt),
        isUnread: (lastSeenAt ? new Date(order.createdAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: order.isPaid ? "Paid order" : "Awaiting payment",
      };
    }),
    ...reviews.map((review) => {
      const id = `review-${asId(review._id)}`;
      return {
        id,
        type: "review" as const,
        title: "New menuItem review",
        description: `${review.user?.name || "Customer"} rated ${review.menuItem?.name || "a menuItem"} ${review.rating}/5${review.title ? ` — ${review.title}` : ""}.`,
        href: "/admin/reviews",
        createdAt: asDate(review.createdAt),
        isUnread: (lastSeenAt ? new Date(review.createdAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: review.isVerifiedPurchase ? "Verified purchase" : "Customer feedback",
      };
    }),
    ...subscriptions.map((subscription) => {
      const id = `stock-subscription-${asId(subscription._id)}`;
      const createdAt = subscription.subscribedAt || subscription.createdAt || new Date();
      return {
        id,
        type: "stock-subscription" as const,
        title: "Restock request created",
        description: `${subscription.email} asked to be notified when ${subscription.menuItem?.name || "a menuItem"} is back in stock.`,
        href: "/admin/stockSubs",
        createdAt: asDate(createdAt),
        isUnread: (lastSeenAt ? new Date(createdAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: subscription.isNotified ? "Already notified" : "Waiting for restock",
      };
    }),
    ...customers.map((customer) => {
      const id = `customer-${asId(customer._id)}`;
      return {
        id,
        type: "customer" as const,
        title: "New customer account",
        description: `${customer.name || customer.email} created an account${customer.email ? ` with ${customer.email}` : ""}.`,
        href: "/admin/users",
        createdAt: asDate(customer.createdAt),
        isUnread: (lastSeenAt ? new Date(customer.createdAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: customer.emailVerified ? "Email verified" : "Needs verification",
      };
    }),
    ...supportTickets.map((ticket) => {
      const id = `support-${asId(ticket._id)}`;
      return {
        id,
        type: "support" as const,
        title: `New support ${ticket.type}`,
        description: `${ticket.name} (${ticket.email}) submitted: ${ticket.subject}`,
        href: "/admin/support",
        createdAt: asDate(ticket.createdAt),
        isUnread: (lastSeenAt ? new Date(ticket.createdAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: ticket.status === "replied" ? "Already replied" : "Needs admin response",
      };
    }),
    ...affiliates.map((affiliate) => {
      const id = `affiliate-${asId(affiliate._id)}`;
      return {
        id,
        type: "affiliate" as const,
        title: "New affiliate application",
        description: `${affiliate.user?.name || "A user"} applied to be an affiliate (Code: ${affiliate.affiliateCode}).`,
        href: "/admin/affiliates",
        createdAt: asDate(affiliate.createdAt),
        isUnread: (lastSeenAt ? new Date(affiliate.createdAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: affiliate.status === "pending" ? "Application pending" : `Status: ${affiliate.status}`,
      };
    }),
    ...payouts.map((payout) => {
      const id = `affiliate-payout-${asId(payout._id)}`;
      return {
        id,
        type: "affiliate-payout" as const,
        title: "New affiliate payout request",
        description: `${getAffiliatePayoutUserName(payout.affiliate) || "An affiliate"} requested a payout of ${formatCurrency(payout.amount)} via ${payout.paymentMethod}.`,
        href: "/admin/payouts",
        createdAt: asDate(payout.createdAt),
        isUnread: (lastSeenAt ? new Date(payout.createdAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: payout.status === "pending" ? "Payout pending" : `Status: ${payout.status}`,
      };
    }),
    ...walletPayouts.map((payout) => {
      const id = `wallet-payout-${asId(payout._id)}`;
      return {
        id,
        type: "wallet-payout" as const,
        title: "New wallet payout request",
        description: `${payout.user?.name || "A user"} requested a wallet payout of ${formatCurrency(payout.amount)} via ${payout.paymentMethod}.`,
        href: "/admin/wallet/payouts",
        createdAt: asDate(payout.createdAt),
        isUnread: (lastSeenAt ? new Date(payout.createdAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: payout.status === "pending" ? "Payout pending" : `Status: ${payout.status}`,
      };
    }),
    ...(await Order.find({ status: "cancelled" })
      .populate("user", "name")
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()).map((order) => {
      const id = `order-cancelled-${asId(order._id)}`;
      return {
        id,
        type: "order" as const,
        title: "Order cancelled",
        description: `Order ${order._id.toString().slice(-8).toUpperCase()} was cancelled by ${((order.user as { name?: string } | null | undefined)?.name) || "Customer"}.`,
        href: `/admin/orders/${asId(order._id)}`,
        createdAt: asDate(order.updatedAt),
        isUnread: (lastSeenAt ? new Date(order.updatedAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: "Cancellation",
      };
    }),
    ...(await Order.find({ status: "return_requested" })
      .populate("user", "name")
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()).map((order) => {
      const id = `order-return-requested-${asId(order._id)}`;
      return {
        id,
        type: "order" as const,
        title: "New return request",
        description: `Customer ${(order.user as { name?: string } | null | undefined)?.name || ""} requested a return for order ${order._id.toString().slice(-8).toUpperCase()}.`,
        href: `/admin/orders/${asId(order._id)}`,
        createdAt: asDate(order.updatedAt),
        isUnread: (lastSeenAt ? new Date(order.updatedAt) > lastSeenAt : true) && !readIdsSet.has(id),
        meta: "Return Request",
      };
    }),
  ]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);

  return {
    unreadCount: items.filter((item) => item.isUnread).length,
    lastSeenAt: lastSeenAt?.toISOString() ?? null,
    items,
  };
}

export async function markAdminNotificationsRead() {
  try {
    await connectToDatabase();
    const session = await ensureAdminSession();

    await AdminNotificationState.findOneAndUpdate(
      { adminUser: session.user.id },
      {
        $set: { lastSeenAt: new Date(), readIds: [] },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    revalidatePath("/admin");
    return { success: true, message: "Notifications marked as read." };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function markAdminNotificationAsRead(id: string) {
  try {
    await connectToDatabase();
    const session = await ensureAdminSession();

    const MAX_READ_IDS = 1000;

    await AdminNotificationState.findOneAndUpdate(
      { adminUser: session.user.id },
      [
        {
          $set: {
            adminUser: { $ifNull: ["$adminUser", session.user.id] },
            readIds: {
              $slice: [
                {
                  $concatArrays: [
                    {
                      $filter: {
                        input: { $ifNull: ["$readIds", []] },
                        as: "item",
                        cond: { $ne: ["$$item", id] },
                      },
                    },
                    [id],
                  ],
                },
                -MAX_READ_IDS,
              ],
            },
          },
        },
      ],
      {
        upsert: true,
        new: true,
      }
    );

    revalidatePath("/admin");
    return { success: true, message: "Notification marked as read." };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
