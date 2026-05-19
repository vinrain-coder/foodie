"use server";

import { Cart, IOrderList, OrderItem, ShippingAddress } from "@/types";
import { escapeRegExp, formatError, round2 } from "../utils";
import {
  canTransitionOrderStatus,
  generateTrackingNumber,
  normalizeOrderStatus,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  OrderTrackingHistoryEventInput,
  OrderTrackingStatus,
  shouldSendStatusNotification,
} from "../order-tracking";
import { connectToDatabase } from "../db";
import { OrderInputSchema } from "../validator";
import Order, { IOrder } from "../db/models/order.model";
import { flattenZodErrors } from "../utils";
import { ActionState } from "@/types/action-state";
import { revalidatePath } from "next/cache";
import {
  sendAdminEventNotification,
  sendAskReviewOrderItems,
  sendOrderTrackingNotification,
  sendPurchaseReceipt,
} from "@/lib/email/transactional";
import { DateRange } from "react-day-picker";
import MenuItem from "../db/models/menu.item.model";
import User from "../db/models/user.model";
import Review from "../db/models/review.model";
import NewsletterSubscription from "../db/models/newsletter-subscription.model";
import SupportTicket from "../db/models/support-ticket.model";
import mongoose from "mongoose";
import FirstPurchaseClaim from "../db/models/first-purchase-claim.model";
import WalletTransaction from "../db/models/wallet-transaction.model";
import BNPLPayment from "../db/models/bnpl-payment.model";
import CoinTransaction from "../db/models/coin-transaction.model";
import { getSetting } from "./setting.actions";
import { getServerSession } from "../get-session";
import { cacheLife } from "next/cache";
import {
  validateCoupon,
  incrementCouponUsage,
  decrementCouponUsage,
} from "./coupon.actions";
import {
  getAffiliateByCode,
  incrementAffiliateUsage,
  decrementAffiliateUsage,
} from "./affiliate.actions";
import Affiliate from "../db/models/affiliate.model";
import AffiliateEarning from "../db/models/affiliate-earning.model";
import { cookies } from "next/headers";
import { calculateShippingPrice } from "../delivery";
import DeliveryLocation from "../db/models/delivery-location.model";
import Installment from "../db/models/installment.model";
import { canAccessAdminDashboard } from "@/lib/dashboard-access";
import { getStaffScope } from "@/lib/staff-scope";

export type SerializedOrder = Omit<IOrder, "_id"> & { _id: string };

type OrderCouponInput = {
  _id?: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountAmount?: number;
  isAffiliate?: boolean;
  isFirstPurchase?: boolean;
};

type FirstPurchaseDiscountQuote = {
  eligible: boolean;
  rate: number;
  discountAmount: number;
};

const getFirstPurchaseDiscountQuoteForUser = async (
  userId: string | undefined,
  email: string | undefined,
  itemsPrice: number,
): Promise<FirstPurchaseDiscountQuote> => {
  const {
    common: { firstPurchaseDiscountRate = 0 },
  } = await getSetting();
  const normalizedRate = Math.max(
    0,
    Math.min(100, Number(firstPurchaseDiscountRate) || 0),
  );
  const normalizedItemsPrice = Math.max(0, Number(itemsPrice) || 0);

  if ((!userId && !email) || normalizedRate <= 0 || normalizedItemsPrice <= 0) {
    return { eligible: false, rate: normalizedRate, discountAmount: 0 };
  }

  let existingOrdersCount = 0;
  let firstPurchaseDiscountUsed = false;

  if (userId) {
    const [user, userOrdersCount] = await Promise.all([
      User.findById(userId).select("firstPurchaseDiscountUsed").lean(),
      Order.countDocuments({ user: userId }),
    ]);
    firstPurchaseDiscountUsed = user?.firstPurchaseDiscountUsed || false;
    existingOrdersCount = userOrdersCount;
  } else if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    existingOrdersCount = await Order.countDocuments({
      userEmail: normalizedEmail,
    });
  }

  if (firstPurchaseDiscountUsed || existingOrdersCount > 0) {
    return { eligible: false, rate: normalizedRate, discountAmount: 0 };
  }

  const discountAmount = Math.min(
    round2((normalizedItemsPrice * normalizedRate) / 100),
    normalizedItemsPrice,
  );

  return {
    eligible: discountAmount > 0,
    rate: normalizedRate,
    discountAmount,
  };
};

export const getFirstPurchaseDiscountQuote = async (
  itemsPrice: number,
  email?: string,
) => {
  try {
    await connectToDatabase();
    const session = await getServerSession();

    return await getFirstPurchaseDiscountQuoteForUser(
      session?.user?.id,
      email,
      itemsPrice,
    );
  } catch (error) {
    console.error("Failed to fetch first purchase discount quote:", error);
    return { eligible: false, rate: 0, discountAmount: 0 };
  }
};

const serializeOrder = (order: IOrder | null): SerializedOrder | null => {
  if (!order) return null;

  const serializedOrder = JSON.parse(JSON.stringify(order)) as SerializedOrder;

  // Security: Always omit accessToken in general serialization
  if (serializedOrder.accessToken) {
    delete (serializedOrder as any).accessToken;
  }

  return {
    ...serializedOrder,
    _id: serializedOrder._id.toString(),
  };
};

const buildTrackingLink = (trackingNumber: string) =>
  `/track/${encodeURIComponent(trackingNumber)}`;

const buildRestaurantOrderFilter = (scope: Awaited<ReturnType<typeof getStaffScope>>) =>
  scope.role === "RESTAURANT"
    ? { restaurant: new mongoose.Types.ObjectId(scope.restaurantId) }
    : {};

/**
 * Internal helper to handle incrementing or decrementing usage for coupons/affiliates.
 * Centralizes idempotency logic and dispatching to correct actions.
 */
const handleOrderCouponUsage = async (
  order: IOrder,
  action: "increment" | "decrement",
  session?: mongoose.ClientSession,
) => {
  if (!order.coupon?._id) return;

  const isAffiliate = order.coupon.isAffiliate;
  const filter: any = { _id: order._id };
  const update: any = {};

  if (action === "increment") {
    if (isAffiliate) {
      filter.affiliateUsageIncremented = { $ne: true };
      update.affiliateUsageIncremented = true;
    } else {
      filter.couponUsageIncremented = { $ne: true };
      update.couponUsageIncremented = true;
    }
  } else {
    // decrement
    filter.couponUsageReverted = { $ne: true };
    update.couponUsageReverted = true;
    if (isAffiliate) {
      filter.affiliateUsageIncremented = true;
    } else {
      filter.couponUsageIncremented = true;
    }
  }

  const updatedOrder = await Order.findOneAndUpdate(
    filter,
    { $set: update },
    { new: true, session },
  );

  if (updatedOrder) {
    // Update in-memory order flags to match persisted state
    order.couponUsageIncremented = updatedOrder.couponUsageIncremented;
    order.affiliateUsageIncremented = updatedOrder.affiliateUsageIncremented;
    order.couponUsageReverted = updatedOrder.couponUsageReverted;

    try {
      const couponId = updatedOrder.coupon?._id?.toString();
      if (!couponId) return;
      if (action === "increment") {
        if (isAffiliate) {
          await incrementAffiliateUsage(couponId);
        } else {
          await incrementCouponUsage(couponId);
        }
      } else {
        if (isAffiliate) {
          await decrementAffiliateUsage(couponId);
        } else {
          await decrementCouponUsage(couponId);
        }
      }
    } catch (error) {
      console.error(`Non-critical: Failed to ${action} coupon usage:`, error);
    }
  }
};

const ensureTrackingState = async (
  order: IOrder | (IOrder & { user?: { email?: string; name?: string } }),
) => {
  let changed = false;

  if (!order.trackingNumber) {
    order.trackingNumber = generateTrackingNumber();
    changed = true;
  }

  if (!order.status) {
    order.status = order.isDelivered ? "delivered" : "confirmed";
    changed = true;
  }

  if (!order.trackingHistory || order.trackingHistory.length === 0) {
    appendTrackingHistory(order, {
      status: order.status,
      message: `Order currently ${ORDER_STATUS_LABELS[order.status].toLowerCase()}.`,
      source: "system",
    });
    changed = true;
  }

  if (changed) {
    await order.save();
  }

  return order;
};

const appendTrackingHistory = (
  order: IOrder | (IOrder & { user?: { email?: string; name?: string } }),
  event: OrderTrackingHistoryEventInput,
) => {
  const createdAt = event.createdAt ?? new Date();
  const history = [...(order.trackingHistory || [])];
  const lastEvent = history[history.length - 1];

  if (
    lastEvent &&
    lastEvent.status === event.status &&
    lastEvent.message === event.message
  ) {
    return false;
  }

  history.push({
    status: event.status,
    message: event.message,
    location: event.location,
    source: event.source ?? "system",
    metadata: event.metadata,
    createdAt,
  });

  history.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  order.trackingHistory = history;
  return true;
};

const notifyCustomerOrderStatus = async (
  order: IOrder | (IOrder & { user?: { email?: string; name?: string } }),
  status: OrderTrackingStatus,
  message: string,
) => {
  if (!shouldSendStatusNotification(status)) return;

  let email =
    order.userEmail || (order.user as unknown as { email?: string })?.email;

  if (!email && order.user) {
    const populatedOrder = await Order.findById(order._id).populate(
      "user",
      "email name",
    );
    email = (populatedOrder?.user as unknown as { email?: string })?.email;
    if (email) {
      (order as any).user = populatedOrder?.user;
      order.userEmail = email;
    }
  } else if (email && !order.userEmail) {
    order.userEmail = email;
  }

  if (!email) return;

  const { site } = await getSetting();
  const trackingLink = `${site.url}${buildTrackingLink(order.trackingNumber)}`;

  await sendOrderTrackingNotification({
    order: order as IOrder,
    statusLabel: ORDER_STATUS_LABELS[status],
    statusMessage: message,
    trackingLink,
  });
};

const revertOrderEffects = async (
  order: IOrder,
  options: {
    refundToWallet: boolean;
    session?: mongoose.ClientSession;
  } = { refundToWallet: true },
) => {
  const session = options.session;
  const explicitUserId = (order.user as any)?._id || order.user;
  let refundUserId = explicitUserId;

  if (!refundUserId) {
    const refundEmail =
      order.userEmail?.trim().toLowerCase() ||
      order.shippingAddress?.email?.trim().toLowerCase();
    if (refundEmail) {
      const existingUser = await User.findOne({ email: refundEmail })
        .session(session || null)
        .select("_id")
        .lean();
      if (existingUser) {
        refundUserId = existingUser._id;
      }
    }
  }

  // 1. Centralize refund calculations per source (Only for cancellations)
  if (options.refundToWallet && refundUserId) {
    let walletToRefund = 0;
    let coinsToRefund = 0;

    // A. Handle standard "full" orders that are paid
    if (order.paymentType === "full" && order.isPaid) {
      // Total price is what was actually settled at checkout
      // We must split this total correctly back to its sources
      if (order.paymentMethod === "Coins") {
        coinsToRefund = round2(coinsToRefund + order.totalPrice);
      } else if (order.paymentMethod === "Wallet") {
        walletToRefund = round2(walletToRefund + order.totalPrice);
      } else {
        // Online payments (Paystack) are refunded to Wallet
        // BUT we must account for any coinsRedeemed at checkout
        const baseWalletRef = round2(
          order.totalPrice - (order.coinsRedeemed || 0),
        );
        walletToRefund = round2(walletToRefund + baseWalletRef);
        // coinsRedeemed is handled separately in step C
      }
    }

    // B. Handle partial BNPL repayments
    // This aggregates all subsequent payments made after the order was created
    if (order.paymentType === "bnpl") {
      const repayments = await BNPLPayment.find({
        order: order._id,
        status: "success",
        type: "repayment",
      }).session(session || null);

      for (const p of repayments) {
        if (p.source === "coins") {
          coinsToRefund = round2(coinsToRefund + p.amount);
        } else if (p.source === "wallet" || p.source === "paystack") {
          walletToRefund = round2(walletToRefund + p.amount);
        }
      }

      // Mark all successful repayments as reversed atomically
      if (repayments.length > 0) {
        await BNPLPayment.updateMany(
          { _id: { $in: repayments.map((r) => r._id) } },
          { $set: { status: "reversed" } },
          { session },
        );
      }
    }

    // C. Handle initial checkout redemptions (Applicable to ALL order types)
    // These are the amounts deducted IMMEDIATELY when the order record was created.
    // Standard full orders already had these included in step A logic (partial wallet/coins).
    // To avoid double-counting for full orders, we only add these if they haven't been accounted for.
    if (order.paymentType === "bnpl") {
      if (order.walletAmountRedeemed > 0) {
        walletToRefund = round2(walletToRefund + order.walletAmountRedeemed);
      }
      if (order.coinsRedeemed > 0) {
        coinsToRefund = round2(coinsToRefund + order.coinsRedeemed);
      }
    } else if (
      order.paymentType === "full" &&
      order.isPaid &&
      order.paymentMethod !== "Coins" &&
      order.paymentMethod !== "Wallet"
    ) {
      // For online standard payments, coinsRedeemed was excluded from walletToRefund in step A
      if (order.coinsRedeemed > 0) {
        coinsToRefund = round2(coinsToRefund + order.coinsRedeemed);
      }
    } else if (
      !order.isPaid &&
      (order.paymentType === "full" || order.paymentType === "bnpl")
    ) {
      // Handle cancelled UNPAID orders with initial redemptions (e.g. user redemeed coins but payment failed/not finished)
      if (order.walletAmountRedeemed > 0) {
        walletToRefund = round2(walletToRefund + order.walletAmountRedeemed);
      }
      if (order.coinsRedeemed > 0) {
        coinsToRefund = round2(coinsToRefund + order.coinsRedeemed);
      }
    }

    // Perform Wallet Refund
    if (walletToRefund > 0 && !order.refundedToWallet) {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, refundedToWallet: { $ne: true } },
        { $set: { refundedToWallet: true } },
        { session, new: true },
      );

      if (updatedOrder) {
        const user = await User.findByIdAndUpdate(
          refundUserId,
          { $inc: { walletBalance: walletToRefund } },
          { new: true, session, select: "walletBalance" },
        );

        if (user) {
          const balanceAfter = round2(user.walletBalance || 0);
          const balanceBefore = round2(balanceAfter - walletToRefund);

          await WalletTransaction.create(
            [
              {
                user: refundUserId,
                order: updatedOrder._id,
                amount: walletToRefund,
                reason: `Refund for cancelled order #${updatedOrder.trackingNumber || updatedOrder._id.toString().slice(-6)}`,
                source: "refund",
                balanceBefore,
                balanceAfter,
              },
            ],
            { session },
          );
        }
        order.refundedToWallet = updatedOrder.refundedToWallet;
      }
    }

    // Perform Coins Refund
    if (coinsToRefund > 0 && !order.refundedToCoins) {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, refundedToCoins: { $ne: true } },
        { $set: { refundedToCoins: true } },
        { session, new: true },
      );

      if (updatedOrder) {
        const user = await User.findById(refundUserId).session(session || null);
        if (user) {
          const balanceBefore = round2(user.coins || 0);
          user.coins = round2(balanceBefore + coinsToRefund);
          await user.save({ session });

          await CoinTransaction.create(
            [
              {
                user: refundUserId,
                order: updatedOrder._id,
                amount: coinsToRefund,
                reason: `Refund for cancelled order #${updatedOrder.trackingNumber || updatedOrder._id.toString().slice(-6)}`,
                source: "refund",
                balanceBefore,
                balanceAfter: round2(user.coins),
              },
            ],
            { session },
          );
        }
        order.refundedToCoins = updatedOrder.refundedToCoins;
      }
    }
  }

  // 2. Restore menuItem stock if it was previously adjusted and not yet reverted
  if (order.stockAdjusted && !order.stockReverted) {
    const updatedOrderForStock = await Order.findOneAndUpdate(
      { _id: order._id, stockAdjusted: true, stockReverted: { $ne: true } },
      { $set: { stockReverted: true } },
      { session, new: true },
    );

    if (updatedOrderForStock) {
      for (const item of updatedOrderForStock.items) {
        await MenuItem.updateOne(
          { _id: item.menuItem },
          [
            {
              $set: {
                countInStock: { $add: ["$countInStock", item.quantity] },
                numSales: {
                  $max: [0, { $subtract: ["$numSales", item.quantity] }],
                },
              },
            },
          ],
          { session },
        );
      }
      order.stockReverted = updatedOrderForStock.stockReverted;
    }
  }

  // 3. Revoke earned coins if credited (Revert coins got from cancelled orders)
  if (order.coinsCredited) {
    const updatedOrderForCoins = await Order.findOneAndUpdate(
      { _id: order._id, coinsCredited: true },
      { $set: { coinsCredited: false } },
      { session, new: true },
    );

    if (updatedOrderForCoins) {
      if (updatedOrderForCoins.coinsEarned > 0 && refundUserId) {
        await User.findByIdAndUpdate(
          refundUserId,
          { $inc: { coins: -round2(updatedOrderForCoins.coinsEarned) } },
          { session },
        );
      }
      order.coinsCredited = updatedOrderForCoins.coinsCredited;
    }
  }

  // 4. Revoke affiliate commissions
  if (order.affiliate) {
    const earning = await AffiliateEarning.findOneAndUpdate(
      { order: order._id, status: { $ne: "cancelled" } },
      { $set: { status: "cancelled" } },
      { new: true, session },
    );

    if (earning) {
      await Affiliate.findByIdAndUpdate(
        order.affiliate,
        {
          $inc: {
            earningsBalance: -earning.amount,
            totalEarnings: -earning.amount,
          },
        },
        { session },
      );
    }
  }

  // 5. Revert coupon usage
  await handleOrderCouponUsage(order, "decrement", session);
};

const runStatusTransition = async ({
  order,
  nextStatus,
  message,
  location,
  source = "system",
  metadata,
  actor,
  session,
}: {
  order: IOrder | (IOrder & { user?: { email?: string; name?: string } });
  nextStatus: OrderTrackingStatus;
  message?: string;
  location?: string;
  source?: "system" | "admin" | "courier" | "customer";
  metadata?: Record<string, unknown>;
  actor?: string;
  session?: mongoose.ClientSession;
}) => {
  if (order.status === nextStatus) {
    return { order, notify: () => Promise.resolve() };
  }

  if (!canTransitionOrderStatus(order.status, nextStatus)) {
    throw new Error(
      `Invalid status transition from ${order.status} to ${nextStatus}.`,
    );
  }

  if (nextStatus === "cancelled") {
    await revertOrderEffects(order as IOrder, {
      refundToWallet: true,
      session,
    });
    // Update BNPL fields immediately
    order.financingStatus = "cancelled";
    order.paymentStatus = "cancelled";
    order.remainingAmount = 0;
    order.minimumPayment = 0;
  }

  if (nextStatus === "returned") {
    await revertOrderEffects(order as IOrder, {
      refundToWallet: false,
      session,
    });
  }

  if (nextStatus === "delivered") {
    // If we're moving to delivered, and it's already marked as delivered (e.g. from return_requested)
    // we don't want to overwrite timestamps or backfill
    if (order.isDelivered && order.deliveredAt) {
      order.status = nextStatus;
    } else {
      // Backfill intermediate statuses if jumping to delivered
      const flow = [...ORDER_STATUS_FLOW];
      const currentIndex = flow.indexOf(order.status as any);
      const deliveredIndex = flow.indexOf("delivered");

      if (currentIndex !== -1 && currentIndex < deliveredIndex - 1) {
        const now = Date.now();
        for (let i = currentIndex + 1; i < deliveredIndex; i++) {
          const intermediateStatus = flow[i];
          appendTrackingHistory(order, {
            status: intermediateStatus,
            message: `Order moved to ${ORDER_STATUS_LABELS[intermediateStatus].toLowerCase()} (system).`,
            source: "system",
            // Use slightly earlier timestamps for intermediate events to maintain order
            createdAt: new Date(now - (deliveredIndex - i) * 1000),
          });
        }
      }

      order.status = nextStatus;
      order.isDelivered = true;
      order.deliveredAt = new Date();
      order.shipment = {
        ...order.shipment,
        deliveredAt: order.deliveredAt,
      };
    }
  } else {
    order.status = nextStatus;
  }

  if (nextStatus === "cancelled") {
    order.isDelivered = false;
  }

  appendTrackingHistory(order, {
    status: nextStatus,
    message:
      message ||
      `Order moved to ${ORDER_STATUS_LABELS[nextStatus].toLowerCase()}${actor ? ` by ${actor}` : ""}.`,
    location,
    source,
    metadata,
  });

  await order.save({ session });

  const notify = async () => {
    if (nextStatus === "returned") {
      const user = order.user as unknown as { email?: string; name?: string };
      const finalEmail = order.userEmail || user?.email;
      if (finalEmail) {
        if (!order.userEmail) {
          order.userEmail = finalEmail;
        }
        await sendOrderTrackingNotification({
          order: order as unknown as IOrder,
          statusLabel: "Return Approved",
          statusMessage: "Your return request has been approved.",
          trackingLink: `${(await getSetting()).site.url}${buildTrackingLink(order.trackingNumber)}`,
        });
      }
    }
    await notifyCustomerOrderStatus(
      order,
      nextStatus,
      message || ORDER_STATUS_LABELS[nextStatus],
    );
  };

  return { order, notify };
};

// CREATE
export const createOrder = async (
  clientSideCart: Cart & {
    coupon?: OrderCouponInput;
    userEmail?: string;
    userName?: string;
  },
): Promise<ActionState> => {
  try {
    await connectToDatabase();
  } catch (dbError) {
    return { success: false, message: "Database connection failed" };
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userSession = await getServerSession();

    const result = await createOrderFromCart(
      clientSideCart,
      userSession?.user?.id,
      clientSideCart.coupon,
      clientSideCart.userEmail,
      clientSideCart.userName,
      session,
    );

    if (!("order" in result)) {
      await session.abortTransaction();
      return { success: false, message: result.message, errors: result.errors };
    }

    const { order: createdOrder, notify } = result;

    await session.commitTransaction();

    await notify();

    if (createdOrder.isPaid) {
      await runPostPaymentSideEffects(createdOrder._id.toString());
    }

    const orderUser = userSession?.user?.id
      ? await User.findById(userSession.user.id).select("name email").lean()
      : null;

    await sendAdminEventNotification({
      title: "New order received",
      description: `${orderUser?.name || clientSideCart.userName || clientSideCart.userEmail || "Guest Customer"} placed an order for ${round2(createdOrder.totalPrice).toFixed(2)}.`,
      href: `/admin/orders/${createdOrder._id.toString()}`,
      meta: createdOrder.isPaid ? "Paid order" : "Awaiting payment",
      createdAt: createdOrder.createdAt.toISOString(),
    });

    // For guest checkout, we need to return the accessToken once upon creation
    const serialized = serializeOrder(createdOrder);
    if (createdOrder.isGuest && createdOrder.accessToken && serialized) {
      (serialized as any).accessToken = createdOrder.accessToken;
    }

    let firstInstallment = null;
    if (createdOrder.paymentType === "bnpl") {
      const installment = await Installment.findOne({
        order: createdOrder._id,
      }).sort({ dueDate: 1 });
      if (installment) {
        firstInstallment = {
          _id: installment._id.toString(),
          amount: installment.amount,
        };
      }
    }

    return {
      success: true,
      message: "Order placed successfully",
      data: {
        ...serialized,
        firstInstallment,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    return { success: false, message: formatError(error) };
  } finally {
    session.endSession();
  }
};

export const createOrderFromCart = async (
  clientSideCart: Cart,
  userId: string | undefined,
  coupon?: OrderCouponInput,
  userEmail?: string,
  userName?: string,
  session?: mongoose.ClientSession,
): Promise<
  | { order: IOrder; notify: () => Promise<void> }
  | { success: false; message: string; errors?: Record<string, string[]> }
> => {
  const cookieStore = await cookies();
  let affiliateCode = cookieStore.get("affiliate_code")?.value;
  let affiliateId: string | undefined;

  if (affiliateCode) {
    const affiliate = await getAffiliateByCode(affiliateCode);
    if (affiliate) {
      affiliateId = affiliate._id.toString();
    }
  }

  let appliedCoupon:
    | {
        _id?: string;
        code: string;
        discountType: "percentage" | "fixed";
        discountAmount: number;
        isAffiliate?: boolean;
        isFirstPurchase?: boolean;
      }
    | undefined;

  const { common } = await getSetting();
  let coinsEarned = 0;
  let coinsRedeemed = 0;
  let walletAmountRedeemed = 0;
  let isPaid = false;
  let paidAt: Date | undefined;

  const itemsPriceRaw = round2(
    clientSideCart.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    ),
  );

  const couponCodeToUse = coupon?.code || affiliateCode;

  if (couponCodeToUse) {
    try {
      const result = await validateCoupon(couponCodeToUse, itemsPriceRaw);

      if (result.success && result.data) {
        const { coupon, discount } = result.data;
        appliedCoupon = {
          _id: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType as "percentage" | "fixed",
          discountAmount: discount,
          isAffiliate: (coupon as any).isAffiliate,
          isFirstPurchase: false,
        };

        if (appliedCoupon.isAffiliate) {
          affiliateId = appliedCoupon._id;
          affiliateCode = appliedCoupon.code;
        }
      }
    } catch (error) {
      console.error("Auto-coupon application failed:", error);
    }
  }

  const firstPurchaseDiscount = await getFirstPurchaseDiscountQuoteForUser(
    userId,
    userEmail,
    itemsPriceRaw,
  );
  if (
    firstPurchaseDiscount.eligible &&
    firstPurchaseDiscount.discountAmount > (appliedCoupon?.discountAmount || 0)
  ) {
    appliedCoupon = {
      code: `FIRST-${firstPurchaseDiscount.rate}%`,
      discountType: "percentage",
      discountAmount: firstPurchaseDiscount.discountAmount,
      isAffiliate: false,
      isFirstPurchase: true,
    };

    if (userId) {
      const userUpdate = await User.findOneAndUpdate(
        { _id: userId, firstPurchaseDiscountUsed: { $ne: true } },
        { $set: { firstPurchaseDiscountUsed: true } },
        { session, new: true },
      );
      if (!userUpdate) {
        throw new Error(
          "First purchase discount already used or invalid user.",
        );
      }
    } else if (userEmail) {
      try {
        await FirstPurchaseClaim.create(
          [{ email: userEmail.trim().toLowerCase() }],
          { session },
        );
      } catch (err: any) {
        if (err.code === 11000) {
          throw new Error(
            "First purchase discount already claimed for this email.",
          );
        }
        throw err;
      }
    }
  }

  const pricing = await calcDeliveryDateAndPrice({
    items: clientSideCart.items,
    shippingAddress: clientSideCart.shippingAddress,
    deliveryDateIndex: clientSideCart.deliveryDateIndex,
    discount: appliedCoupon?.discountAmount || 0,
  });

  const cart = {
    ...clientSideCart,
    ...pricing,
  };

  const uniqueMenuItemIds = [
    ...new Set(
      (cart.items || [])
        .map((item) => item.menuItem?.toString())
        .filter((id): id is string => Boolean(id && mongoose.Types.ObjectId.isValid(id))),
    ),
  ];

  const menuItemsForOrder = await MenuItem.find({
    _id: { $in: uniqueMenuItemIds },
  })
    .select("_id name restaurant")
    .lean();

  if (menuItemsForOrder.length !== uniqueMenuItemIds.length) {
    throw new Error("Some menu items are no longer available.");
  }

  const menuItemById = new Map(
    menuItemsForOrder.map((menuItem) => [menuItem._id.toString(), menuItem]),
  );

  const orderRestaurantIdSet = new Set<string>();
  let hasUnassignedMenuItems = false;

  for (const item of cart.items) {
    const dbMenuItem = menuItemById.get(item.menuItem.toString());
    if (!dbMenuItem) {
      throw new Error(`Menu item not found: ${item.name}`);
    }

    if (dbMenuItem.restaurant) {
      orderRestaurantIdSet.add(dbMenuItem.restaurant.toString());
    } else {
      hasUnassignedMenuItems = true;
    }
  }

  if (orderRestaurantIdSet.size > 1) {
    throw new Error(
      "You can only place one order per restaurant. Please checkout items from one restaurant at a time.",
    );
  }

  if (orderRestaurantIdSet.size === 1 && hasUnassignedMenuItems) {
    throw new Error(
      "Your cart mixes restaurant items with non-restaurant items. Please checkout them separately.",
    );
  }

  const orderRestaurantId =
    orderRestaurantIdSet.size === 1
      ? Array.from(orderRestaurantIdSet)[0]
      : undefined;

  if (cart.paymentMethod === "Coins") {
    if (!userId) throw new Error("Authentication required for Coin payments");
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    if (coupon?.code) {
      throw new Error("Coupons cannot be used with wallet payments");
    }
    if (user.coins < cart.totalPrice) {
      throw new Error("Insufficient coins balance");
    }

    coinsRedeemed = cart.totalPrice;
    isPaid = true;
    paidAt = new Date();
  }

  if (cart.paymentMethod === "Wallet") {
    if (!userId) throw new Error("Authentication required for Wallet payments");
    const user = await User.findById(userId).select("walletBalance");
    if (!user) throw new Error("User not found");

    walletAmountRedeemed = cart.totalPrice;
    isPaid = true;
    paidAt = new Date();
  }

  const totalPrice = cart.totalPrice;
  const paymentType = cart.paymentMethod === "BNPL" ? "bnpl" : "full";
  let paymentStatus: "pending" | "partial" | "paid" | "overdue" = "pending";
  let amountPaid = 0;
  let remainingAmount = totalPrice;

  const isBNPL = cart.paymentMethod === "BNPL";

  const dynamicMinimumPayment = isBNPL
    ? Math.min(remainingAmount, Math.max(round2(remainingAmount * 0.2), 100))
    : 0;

  if (isPaid) {
    paymentStatus = "paid";
    amountPaid = totalPrice;
    remainingAmount = 0;
  }

  const bnplDueDate = new Date();
  bnplDueDate.setDate(bnplDueDate.getDate() + 90); // Default 90 days for full repayment

  if (cart.paymentMethod === "BNPL") {
    if (!userId) throw new Error("Authentication required for BNPL");
    paymentStatus = "pending";
    amountPaid = 0;
    remainingAmount = totalPrice;
  }

  coinsEarned = round2(cart.itemsPrice * (common.coinsRewardRate / 100));

  const normalizedUserEmail = (
    userEmail || (userId ? undefined : clientSideCart.shippingAddress?.email)
  )
    ?.trim()
    .toLowerCase();
  const initialTrackingNumber = generateTrackingNumber();
  const validated = OrderInputSchema.safeParse({
    user: userId,
    restaurant: orderRestaurantId,
    isGuest: !userId,
    userEmail: normalizedUserEmail,
    userName: userName || clientSideCart.shippingAddress?.fullName,
    accessToken: !userId ? crypto.randomUUID() : undefined,
    items: cart.items,
    shippingAddress: cart.shippingAddress,
    note: cart.note?.trim() || undefined,
    paymentMethod: cart.paymentMethod,
    itemsPrice: cart.itemsPrice,
    shippingPrice: cart.shippingPrice,
    taxPrice: cart.taxPrice,
    totalPrice,
    expectedDeliveryDate: cart.expectedDeliveryDate,
    coupon: appliedCoupon,
    coinsEarned,
    coinsRedeemed,
    walletAmountRedeemed,
    coinsCredited: false,
    isPaid,
    paidAt,
    paymentType,
    paymentStatus,
    amountPaid,
    remainingAmount,
    bnplDueDate: cart.paymentMethod === "BNPL" ? bnplDueDate : undefined,
    financingStatus: cart.paymentMethod === "BNPL" ? "active" : undefined,
    financingPlan: cart.paymentMethod === "BNPL" ? "standard" : undefined,
    minimumPayment: dynamicMinimumPayment,
    trackingNumber: initialTrackingNumber,
    status: "pending",
    affiliate: affiliateId,
    affiliateCode: affiliateCode,
    shipment: {
      estimatedDeliveryDate: cart.expectedDeliveryDate,
    },
    trackingHistory: [
      {
        status: "pending",
        message: "Order created and awaiting confirmation.",
        source: "system",
      },
    ],
  });

  if (!validated.success) {
    return {
      success: false as const,
      message: "Validation failed",
      errors: flattenZodErrors(validated.error),
    };
  }

  const order = validated.data;
  const createdOrder = new Order(order);

  // Note: Old installment creation is removed in favor of flexible BNPL system

  if (cart.paymentMethod === "Coins") {
    const userUpdate = await User.findOneAndUpdate(
      { _id: userId, coins: { $gte: totalPrice } },
      { $inc: { coins: -totalPrice } },
      { new: true, session },
    );

    if (!userUpdate) {
      throw new Error("Insufficient coins balance or payment failed");
    }
  }

  if (cart.paymentMethod === "Wallet") {
    try {
      const userUpdate = await User.findOneAndUpdate(
        { _id: userId, walletBalance: { $gte: totalPrice } },
        { $inc: { walletBalance: -totalPrice } },
        { new: true, session, select: "walletBalance" },
      );

      if (!userUpdate) {
        throw new Error("Insufficient wallet balance or payment failed");
      }

      const balanceAfter = round2(userUpdate.walletBalance);
      const balanceBefore = round2(balanceAfter + totalPrice);

      await WalletTransaction.create(
        [
          {
            user: userId,
            order: createdOrder._id,
            amount: -totalPrice,
            reason: `Used to pay for order #${createdOrder.trackingNumber || createdOrder._id.toString().slice(-6)}`,
            source: "wallet_payment",
            balanceBefore,
            balanceAfter,
          },
        ],
        { session },
      );
    } catch (error) {
      throw error;
    }
  }

  // Update stock atomically for paid orders within the transaction
  // Save order
  await createdOrder.save({ session });

  if (isPaid && session) {
    for (const item of createdOrder.items) {
      const menuItem = await MenuItem.findById(item.menuItem).session(session);

      if (!menuItem) {
        throw new Error(`MenuItem not found: ${item.menuItem}`);
      }

      if (menuItem.countInStock < item.quantity) {
        throw new Error(
          `Insufficient stock available for ${menuItem.name}. Available: ${menuItem.countInStock}, Required: ${item.quantity}`,
        );
      }

      const result = await MenuItem.updateOne(
        {
          _id: item.menuItem,
          countInStock: { $gte: item.quantity },
        },
        {
          $inc: {
            countInStock: -item.quantity,
            numSales: item.quantity,
          },
        },
        { session },
      );

      if (result.modifiedCount === 0) {
        throw new Error(
          `Insufficient stock available for ${menuItem.name}. Available: ${menuItem.countInStock}, Required: ${item.quantity}`,
        );
      }
    }

    // Mark stock as adjusted to prevent double-update in runPostPaymentSideEffects
    await Order.updateOne(
      { _id: createdOrder._id },
      { $set: { stockAdjusted: true } },
      { session },
    );
    createdOrder.stockAdjusted = true;
  }

  const { notify } = await runStatusTransition({
    order: createdOrder,
    nextStatus: "confirmed",
    message: "Order confirmed and queued for processing.",
    source: "system",
    session,
  });

  return { order: createdOrder, notify };
};

export const runPostPaymentSideEffects = async (orderId: string) => {
  const order = await Order.findById(orderId);
  if (!order) return;

  // 1. Credit earned coins to user
  try {
    const userId = (order.user as any)?._id || order.user;
    if (userId && order.coinsEarned > 0 && !order.coinsCredited) {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, coinsCredited: { $ne: true } },
        { $set: { coinsCredited: true } },
        { new: true },
      );

      if (updatedOrder) {
        order.coinsCredited = updatedOrder.coinsCredited;
        await User.findByIdAndUpdate(userId, {
          $inc: { coins: round2(updatedOrder.coinsEarned) },
        });
      }
    }
  } catch (coinsError) {
    console.error("Non-critical: Failed to credit earned coins:", coinsError);
  }

  // 2. Update menuItem stock
  try {
    const updatedOrderForStock = await Order.findOneAndUpdate(
      { _id: order._id, stockAdjusted: { $ne: true } },
      { $set: { stockAdjusted: true } },
      { new: true },
    );
    if (updatedOrderForStock) {
      order.stockAdjusted = updatedOrderForStock.stockAdjusted;
      await updateMenuItemStock(updatedOrderForStock._id.toString());
    }
  } catch (stockError) {
    console.error("Critical: Failed to update menu item stock:", stockError);
    throw stockError;
  }

  // 3. Increment coupon usage
  await handleOrderCouponUsage(order, "increment");

  // 4. Handle Affiliate Earnings
  try {
    if (order.affiliate) {
      const { affiliate: settings } = await getSetting();
      if (settings?.enabled) {
        const affiliateDoc = await Affiliate.findById(order.affiliate);
        if (affiliateDoc && affiliateDoc.status === "approved") {
          const commissionRate = settings.commissionRate;

          const commissionAmount = round2(
            (order.itemsPrice * commissionRate) / 100,
          );

          if (commissionAmount > 0) {
            const existingEarning = await AffiliateEarning.findOne({
              order: order._id,
            });
            if (!existingEarning) {
              await AffiliateEarning.create({
                affiliate: order.affiliate,
                order: order._id,
                amount: commissionAmount,
                commissionRate: commissionRate,
                status: "earned",
              });

              await Affiliate.findByIdAndUpdate(order.affiliate, {
                $inc: {
                  earningsBalance: commissionAmount,
                  totalEarnings: commissionAmount,
                },
              });
              revalidatePath("/affiliate/dashboard");
            }
          }
        }
      }
    }
  } catch (affiliateError) {
    console.error(
      "Non-critical: Failed to process affiliate earnings:",
      affiliateError,
    );
  }

  // 5. Send purchase receipt
  try {
    const populatedOrder = await Order.findById(orderId).populate(
      "user",
      "name email",
    );
    const emailUser = (populatedOrder?.user as unknown as { email?: string })
      ?.email;
    const finalEmail = populatedOrder?.userEmail || emailUser;

    if (finalEmail) {
      if (!populatedOrder?.userEmail) {
        populatedOrder!.userEmail = finalEmail;
      }
      await sendPurchaseReceipt(populatedOrder as unknown as IOrder);
    }
  } catch (emailError) {
    console.error(
      "Non-critical: Failed to send purchase receipt email:",
      emailError,
    );
  }

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}`);
};

const processOrderPayment = async (orderId: string, paymentInfo?: any) => {
  await connectToDatabase();
  const order = await Order.findById(orderId);

  if (!order) throw new Error("Order not found");
  if (order.isPaid) return { success: true, message: "Order is already paid" };

  order.isPaid = true;
  order.paidAt = new Date();
  order.amountPaid = order.totalPrice;
  order.remainingAmount = 0;
  order.paymentStatus = "paid";

  if (paymentInfo) {
    order.paymentResult = paymentInfo;
  }

  appendTrackingHistory(order, {
    status: order.status,
    message: paymentInfo
      ? "Payment verified by gateway."
      : "Payment received successfully.",
    source: "system",
  });

  await order.save();

  await runPostPaymentSideEffects(orderId);

  return { success: true, message: "Order paid successfully" };
};

export async function updateOrderToPaid(orderId: string) {
  try {
    return await processOrderPayment(orderId);
  } catch (err) {
    return { success: false, message: formatError(err) };
  }
}

const updateMenuItemStock = async (
  orderId: string,
  session?: mongoose.ClientSession,
) => {
  try {
    const order = await Order.findById(orderId).session(session || null);
    if (!order) throw new Error("Order not found");

    for (const item of order.items) {
      const menuItem = await MenuItem.findById(item.menuItem)
        .session(session || null)
        .exec();

      if (!menuItem) {
        throw new Error(`MenuItem not found: ${item.menuItem}`);
      }

      if (menuItem.countInStock < item.quantity) {
        throw new Error(
          `Insufficient stock available for ${menuItem.name}. Available: ${menuItem.countInStock}, Required: ${item.quantity}`,
        );
      }

      const result = await MenuItem.updateOne(
        {
          _id: item.menuItem,
          countInStock: { $gte: item.quantity },
        },
        {
          $inc: {
            countInStock: -item.quantity,
            numSales: item.quantity,
          },
        },
        { session },
      ).exec();

      if (result.modifiedCount === 0) {
        throw new Error(
          `Insufficient stock available for ${menuItem.name}. Available: ${menuItem.countInStock}, Required: ${item.quantity}`,
        );
      }
    }
    return true;
  } catch (error) {
    console.error("Failed to update menu item stock:", error);
    throw error;
  }
};

export async function updateOrderStatus({
  orderId,
  status,
  message,
  location,
  courierName,
  courierTrackingReference,
  estimatedDeliveryDate,
}: {
  orderId: string;
  status: string;
  message?: string;
  location?: string;
  courierName?: string;
  courierTrackingReference?: string;
  estimatedDeliveryDate?: Date;
}) {
  try {
    await connectToDatabase();
    const scope = await getStaffScope();

    const normalizedStatus = normalizeOrderStatus(status);
    if (!normalizedStatus) throw new Error("Invalid order status value.");

    const orderFilter = {
      _id: orderId,
      ...buildRestaurantOrderFilter(scope),
    };

    const order = await Order.findOne(orderFilter).populate<{
      user: { email: string; name: string };
    }>("user", "name email");

    if (!order) throw new Error("Order not found");

    if (courierName || courierTrackingReference || estimatedDeliveryDate) {
      order.shipment = {
        ...order.shipment,
        ...(courierName ? { courierName } : {}),
        ...(courierTrackingReference ? { courierTrackingReference } : {}),
        ...(estimatedDeliveryDate ? { estimatedDeliveryDate } : {}),
        ...(normalizedStatus === "shipped" ? { dispatchedAt: new Date() } : {}),
      };
    }

    const { notify } = await runStatusTransition({
      order,
      nextStatus: normalizedStatus,
      message,
      location,
      source: "admin",
      actor: scope.userName,
    });

    await notify();

    if (normalizedStatus === "delivered") {
      const finalEmail =
        order.userEmail || (order.user as unknown as { email?: string })?.email;
      if (finalEmail) {
        if (!order.userEmail) order.userEmail = finalEmail;
        await sendAskReviewOrderItems(order as unknown as IOrder);
      }
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(buildTrackingLink(order.trackingNumber));

    return {
      success: true,
      message: `Order status updated to ${ORDER_STATUS_LABELS[normalizedStatus]}`,
    };
  } catch (err) {
    return { success: false, message: formatError(err) };
  }
}

export async function initiateExchange(orderId: string) {
  try {
    await connectToDatabase();
    const scope = await getStaffScope();

    const order = await Order.findOne({
      _id: orderId,
      ...buildRestaurantOrderFilter(scope),
    }).populate<{
      user: { email: string; name: string };
    }>("user", "name email");

    if (!order) throw new Error("Order not found");
    if (order.status !== "returned") {
      throw new Error("Exchange can only be initiated for returned orders");
    }

    order.isExchangeInitiated = true;
    appendTrackingHistory(order, {
      status: "returned",
      message:
        "Admin initiated an exchange for a different menu item. User will pay for delivery costs.",
      source: "admin",
    });

    await order.save();

    const user = order.user as unknown as { email?: string; name?: string };
    if (user?.email) {
      await sendOrderTrackingNotification({
        order: order as unknown as IOrder,
        statusLabel: "Exchange Initiated",
        statusMessage:
          "An exchange has been initiated for your returned order. Please note that you will be responsible for the new delivery costs.",
        trackingLink: `${(await getSetting()).site.url}${buildTrackingLink(order.trackingNumber)}`,
      });
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath(`/admin/orders/${orderId}`);

    return {
      success: true,
      message: "Exchange process initiated successfully",
    };
  } catch (err) {
    return { success: false, message: formatError(err) };
  }
}

export async function deliverOrder(orderId: string) {
  return updateOrderStatus({
    orderId,
    status: "delivered",
    message: "Order marked as delivered.",
  });
}

export async function cancelOrder(orderId: string, accessToken?: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    const cookieStore = await cookies();
    const guestAccessToken =
      accessToken || cookieStore.get(`guest_order_access_${orderId}`)?.value;

    if (!session && !guestAccessToken) {
      throw new Error("User not authenticated");
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    let notificationTrigger: () => Promise<void> = () => Promise.resolve();
    let order: IOrder | null = null;

    try {
      order = await Order.findById(orderId).session(dbSession).populate<{
        user: { _id: string; email: string; name: string };
      }>("user", "name email");

      if (!order) throw new Error("Order not found");

      const isUserOwner =
        Boolean(session?.user?.id) &&
        order.user?._id?.toString() === session?.user?.id;

      let isStaffOrderManager = false;
      if (canAccessAdminDashboard(session?.user?.role)) {
        const scope = await getStaffScope();
        if (scope.role === "ADMIN") {
          isStaffOrderManager = true;
        } else if (scope.role === "RESTAURANT") {
          isStaffOrderManager =
            order.restaurant?.toString() === scope.restaurantId;
        }
      }

      const isGuestOwner =
        !session && order.isGuest && order.accessToken === guestAccessToken;

      if (!isUserOwner && !isStaffOrderManager && !isGuestOwner) {
        throw new Error("Unauthorized");
      }

      if (!["pending", "confirmed", "processing"].includes(order.status)) {
        throw new Error(`Order cannot be cancelled in ${order.status} status`);
      }

      const { notify } = await runStatusTransition({
        order,
        nextStatus: "cancelled",
        message: `Order cancelled by ${isStaffOrderManager ? "staff" : "customer"}.`,
        source: isStaffOrderManager ? "admin" : "customer",
        actor: session?.user?.name || "Guest customer",
        session: dbSession,
      });

      notificationTrigger = notify;

      await dbSession.commitTransaction();
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }

    await notificationTrigger();

    await sendAdminEventNotification({
      title: "Order cancelled",
      description: `Order ${orderId.slice(-8).toUpperCase()} was cancelled by ${session?.user?.name || "Guest customer"}.`,
      href: `/admin/orders/${orderId}`,
      meta: order.isPaid ? "Paid amount refunded to wallet" : "Unpaid order",
      createdAt: new Date().toISOString(),
    });

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");

    return { success: true, message: "Order cancelled successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function requestReturnOrder(orderId: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session) throw new Error("User not authenticated");

    const order = await Order.findById(orderId).populate<{
      user: { _id: string; email: string; name: string };
    }>("user", "name email");

    if (!order) throw new Error("Order not found");

    if (order.user?._id?.toString() !== session.user.id) {
      throw new Error("Unauthorized");
    }

    if (order.status !== "delivered") {
      throw new Error("Only delivered orders can be returned");
    }

    if (!order.deliveredAt) {
      throw new Error("Delivery date not recorded");
    }

    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const isWithinReturnWindow =
      Date.now() - new Date(order.deliveredAt).getTime() <= sevenDaysInMs;

    if (!isWithinReturnWindow) {
      throw new Error("Return period has expired (7 days after delivery)");
    }

    const { notify } = await runStatusTransition({
      order,
      nextStatus: "return_requested",
      message: "Customer requested a return.",
      source: "customer",
      actor: session.user.name,
    });

    await notify();

    await sendAdminEventNotification({
      title: "Return request received",
      description: `${session.user.name} requested a return for order ${orderId.slice(-8).toUpperCase()}.`,
      href: `/admin/orders/${orderId}`,
      createdAt: new Date().toISOString(),
    });

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true, message: "Return request submitted successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getOrderByTrackingNumber(trackingNumber: string) {
  await connectToDatabase();
  const order = await Order.findOne({ trackingNumber }).select(
    "_id trackingNumber status trackingHistory shipment expectedDeliveryDate shippingAddress items itemsPrice shippingPrice taxPrice totalPrice updatedAt",
  );

  if (!order) return null;
  const hydrated = await ensureTrackingState(order as IOrder);
  return serializeOrder(hydrated);
}

// DELETE
export async function deleteOrder(id: string) {
  try {
    await connectToDatabase();
    const scope = await getStaffScope();

    const res = await Order.findOneAndDelete({
      _id: id,
      ...buildRestaurantOrderFilter(scope),
    });
    if (!res) throw new Error("Order not found");
    revalidatePath("/admin/orders");
    return {
      success: true,
      message: "Order deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// GET ALL ORDERS

export async function getAllOrders({
  limit,
  page,
  status,
  from,
  to,
  query,
}: {
  limit?: number;
  page: number;
  status?: string;
  from?: string;
  to?: string;
  query?: string;
}) {
  "use cache: private";
  cacheLife("minutes");
  const scope = await getStaffScope();
  const {
    common: { pageSize },
  } = await getSetting();
  limit = limit || pageSize;
  await connectToDatabase();
  const skipAmount = (Number(page) - 1) * limit;

  const filter: any = {};
  Object.assign(filter, buildRestaurantOrderFilter(scope));
  if (status && status !== "all") {
    filter.status = status;
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }
  if (query) {
    const escapedQuery = escapeRegExp(query);
    const users = await User.find({
      name: { $regex: escapedQuery, $options: "i" },
    })
      .select("_id")
      .limit(50);
    const userIds = users.map((u) => u._id);

    filter.$or = [
      { trackingNumber: { $regex: escapedQuery, $options: "i" } },
      { user: { $in: userIds } },
      { userName: { $regex: escapedQuery, $options: "i" } },
      { userEmail: { $regex: escapedQuery, $options: "i" } },
    ];
    if (mongoose.Types.ObjectId.isValid(query)) {
      filter.$or.push({ _id: query });
    }
  }

  const orders = await Order.find(filter)
    .populate("user", "name")
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(limit);
  const ordersCount = await Order.countDocuments(filter);
  return {
    data: JSON.parse(JSON.stringify(orders)) as IOrderList[],
    totalPages: Math.ceil(ordersCount / limit),
    totalOrders: ordersCount,
  };
}

export async function getOrderStatusStats(
  dateRange?: {
    from?: string;
    to?: string;
  },
  searchQuery?: string,
) {
  "use cache: private";
  cacheLife("minutes");
  const scope = await getStaffScope();
  await connectToDatabase();

  const filter: any = { ...buildRestaurantOrderFilter(scope) };
  if (dateRange?.from || dateRange?.to) {
    filter.createdAt = {};
    if (dateRange.from) filter.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  if (searchQuery) {
    const escapedQuery = escapeRegExp(searchQuery);
    const users = await User.find({
      name: { $regex: escapedQuery, $options: "i" },
    })
      .select("_id")
      .limit(50);
    const userIds = users.map((u) => u._id);

    filter.$or = [
      { trackingNumber: { $regex: escapedQuery, $options: "i" } },
      { user: { $in: userIds } },
      { userName: { $regex: escapedQuery, $options: "i" } },
      { userEmail: { $regex: escapedQuery, $options: "i" } },
    ];
    if (mongoose.Types.ObjectId.isValid(searchQuery)) {
      filter.$or.push({ _id: searchQuery });
    }
  }

  const statusDistribution = await Order.aggregate([
    { $match: filter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const totalOrders = await Order.countDocuments(filter);

  const stats = statusDistribution.reduce(
    (acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    stats,
    totalOrders,
  };
}
export async function getMyOrders({
  limit,
  page,
}: {
  limit?: number;
  page: number;
}) {
  "use cache: private";
  cacheLife("hours");
  const {
    common: { pageSize },
  } = await getSetting();
  limit = limit || pageSize;
  await connectToDatabase();
  const session = await getServerSession();
  if (!session) {
    throw new Error("User is not authenticated");
  }
  const skipAmount = (Number(page) - 1) * limit;
  const orders = await Order.find({
    user: session?.user?.id,
  })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(limit);
  const ordersCount = await Order.countDocuments({ user: session?.user?.id });

  return {
    data: JSON.parse(JSON.stringify(orders)),
    totalPages: Math.ceil(ordersCount / limit),
  };
}
export async function getOrderById(
  orderId: string,
  accessToken?: string,
): Promise<SerializedOrder | null> {
  "use cache: private";
  cacheLife("hours");
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return null;
  }

  const session = await getServerSession();
  const cookieStore = await cookies();
  const guestAccessToken =
    accessToken || cookieStore.get(`guest_order_access_${orderId}`)?.value;

  const query: any = { _id: orderId };

  if (canAccessAdminDashboard(session?.user?.role)) {
    const scope = await getStaffScope();
    if (scope.role === "RESTAURANT") {
      query.restaurant = new mongoose.Types.ObjectId(scope.restaurantId);
    }
  } else {
    if (session?.user?.id) {
      query.$or = [
        { user: session.user.id },
        { isGuest: true, accessToken: guestAccessToken },
      ];
    } else {
      query.isGuest = true;
      query.accessToken = guestAccessToken;
    }
  }

  const order = await Order.findOne(query);
  if (!order) return null;
  const hydrated = await ensureTrackingState(order);
  return serializeOrder(hydrated);
}

export const calcDeliveryDateAndPrice = async ({
  items = [],
  shippingAddress,
  deliveryDateIndex,
  discount = 0,
}: {
  deliveryDateIndex?: number;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  discount?: number;
}) => {
  try {
    const { availableDeliveryDates, common } = await getSetting();
    const itemsPrice = round2(
      (items || []).reduce(
        (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
        0,
      ),
    );

    let locationRate = 0;
    if (shippingAddress?.province && shippingAddress?.city) {
      await connectToDatabase();
      const normalizedProvince = (shippingAddress.province || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      const normalizedCity = (shippingAddress.city || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

      if (normalizedProvince && normalizedCity) {
        const location = await DeliveryLocation.findOne({
          county: normalizedProvince,
          city: normalizedCity,
        }).lean();
        if (location) {
          locationRate = location.rate || 0;
        }
      }
    }

    const safeDeliveryDateIndex =
      deliveryDateIndex === undefined || isNaN(Number(deliveryDateIndex))
        ? Math.max(0, (availableDeliveryDates?.length || 1) - 1)
        : Number(deliveryDateIndex);

    const deliveryDate = availableDeliveryDates?.[safeDeliveryDateIndex];

    const shippingPrice =
      !shippingAddress || !deliveryDate
        ? 0
        : calculateShippingPrice({
            deliveryDate,
            itemsPrice,
            shippingRate: locationRate,
          });

    const netItemsPrice = Math.max(0, itemsPrice - (discount || 0));
    const taxRate = common?.taxRate ?? 0;
    const taxPrice = !shippingAddress
      ? 0
      : round2(netItemsPrice * (taxRate / 100));

    const safeShippingPrice = shippingPrice ?? 0;
    const totalPrice = round2(netItemsPrice + safeShippingPrice + taxPrice);

    return {
      deliveryDateIndex: safeDeliveryDateIndex,
      itemsPrice: Number(itemsPrice) || 0,
      shippingPrice: Number(safeShippingPrice) || 0,
      taxPrice: Number(taxPrice) || 0,
      discount: Number(discount) || 0,
      totalPrice: Number(totalPrice) || 0,
    };
  } catch (error) {
    console.error("calcDeliveryDateAndPrice error:", error);
    return {
      deliveryDateIndex: 0,
      itemsPrice: 0,
      shippingPrice: 0,
      taxPrice: 0,
      discount: 0,
      totalPrice: 0,
    };
  }
};

// GET ORDERS BY USER
export async function getOrderSummary(date: DateRange) {
  "use cache: private";
  cacheLife("minutes");
  await connectToDatabase();
  const scope = await getStaffScope();
  const restaurantFilter = buildRestaurantOrderFilter(scope);
  const restaurantMenuItemFilter =
    scope.role === "RESTAURANT"
      ? { restaurant: new mongoose.Types.ObjectId(scope.restaurantId) }
      : {};

  const query = {
    ...restaurantFilter,
    createdAt: {
      $gte: date.from,
      $lte: date.to,
    },
  };

  let reviewsCountPromise: Promise<number>;
  if (scope.role === "RESTAURANT") {
    reviewsCountPromise = MenuItem.find(restaurantMenuItemFilter)
      .select("_id")
      .lean()
      .then((menuItems) => {
        const ids = menuItems.map((item) => item._id);
        if (ids.length === 0) return 0;
        return Review.countDocuments({
          menuItem: { $in: ids },
          createdAt: query.createdAt,
        });
      });
  } else {
    reviewsCountPromise = Review.countDocuments(query);
  }

  let usersCountPromise: Promise<number>;
  if (scope.role === "RESTAURANT") {
    usersCountPromise = Promise.all([
      Order.distinct("user", { ...query, user: { $ne: null } }),
      Order.distinct("userEmail", {
        ...query,
        isGuest: true,
        userEmail: { $exists: true, $ne: "" },
      }),
    ]).then(([registeredUsers, guestEmails]) => {
      return registeredUsers.length + guestEmails.length;
    });
  } else {
    usersCountPromise = User.countDocuments(query);
  }

  const [
    ordersCount,
    menuItemsCount,
    usersCount,
    reviewsCount,
    newslettersCount,
    ticketsCount,
  ] = await Promise.all([
    Order.countDocuments(query),
    MenuItem.countDocuments({ ...query, ...restaurantMenuItemFilter }),
    usersCountPromise,
    reviewsCountPromise,
    scope.role === "RESTAURANT"
      ? Promise.resolve(0)
      : NewsletterSubscription.countDocuments({
          ...query,
          status: "subscribed",
        }),
    scope.role === "RESTAURANT"
      ? Promise.resolve(0)
      : SupportTicket.countDocuments({ status: "open" }),
  ]);

  const totalSalesResult = await Order.aggregate([
    {
      $match: query,
    },
    {
      $group: {
        _id: null,
        sales: { $sum: "$totalPrice" },
      },
    },
    { $project: { totalSales: { $ifNull: ["$sales", 0] } } },
  ]);
  const totalSales = totalSalesResult[0] ? totalSalesResult[0].totalSales : 0;

  const avgOrderValue = ordersCount > 0 ? totalSales / ordersCount : 0;

  const orderStatusDistribution = await Order.aggregate([
    { $match: query },
    { $group: { _id: "$status", value: { $sum: 1 } } },
    { $project: { name: "$_id", value: 1, _id: 0 } },
  ]);

  const today = new Date();
  const sixMonthEarlierDate = new Date(
    today.getFullYear(),
    today.getMonth() - 5,
    1,
  );
  const monthlySales = await Order.aggregate([
    {
      $match: {
        ...restaurantFilter,
        createdAt: {
          $gte: sixMonthEarlierDate,
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        totalSales: { $sum: "$totalPrice" },
      },
    },
    {
      $project: {
        _id: 0,
        label: "$_id",
        value: "$totalSales",
      },
    },

    { $sort: { label: 1 } },
  ]);
  const topSalesCategories = await getTopSalesCategories(date, {
    restaurantFilter,
  });
  const topSalesMenuItems = await getTopSalesMenuItems(date, {
    restaurantFilter,
  });

  const {
    common: { pageSize },
  } = await getSetting();
  const limit = pageSize;
  const latestOrders = await Order.find(restaurantFilter)
    .populate("user", "name")
    .sort({ createdAt: "desc" })
    .limit(limit);

  let latestReviewsQuery = Review.find();
  if (scope.role === "RESTAURANT") {
    const restaurantMenuItems = await MenuItem.find(restaurantMenuItemFilter)
      .select("_id")
      .lean();
    const restaurantMenuItemIds = restaurantMenuItems.map((item) => item._id);
    latestReviewsQuery = Review.find({
      menuItem: { $in: restaurantMenuItemIds },
    });
  }
  const latestReviews = await latestReviewsQuery
    .sort({ createdAt: "desc" })
    .limit(5)
    .populate("user", "name")
    .populate("menuItem", "name");

  const latestSubscribers =
    scope.role === "RESTAURANT"
      ? []
      : await NewsletterSubscription.find()
          .sort({ subscribedAt: "desc" })
          .limit(5)
          .lean();

  return {
    ordersCount,
    menuItemsCount,
    usersCount,
    reviewsCount,
    newslettersCount,
    ticketsCount,
    totalSales,
    avgOrderValue,
    orderStatusDistribution: JSON.parse(
      JSON.stringify(orderStatusDistribution),
    ),
    monthlySales: JSON.parse(JSON.stringify(monthlySales)),
    salesChartData: JSON.parse(
      JSON.stringify(await getSalesChartData(date, { restaurantFilter })),
    ),
    topSalesCategories: JSON.parse(JSON.stringify(topSalesCategories)),
    topSalesMenuItems: JSON.parse(JSON.stringify(topSalesMenuItems)),
    latestOrders: JSON.parse(JSON.stringify(latestOrders)) as IOrderList[],
    latestReviews: JSON.parse(JSON.stringify(latestReviews)),
    latestSubscribers: JSON.parse(JSON.stringify(latestSubscribers)),
  };
}

async function getSalesChartData(
  date: DateRange,
  options?: { restaurantFilter?: Record<string, unknown> },
) {
  const restaurantFilter = options?.restaurantFilter ?? {};
  const result = await Order.aggregate([
    {
      $match: {
        ...restaurantFilter,
        createdAt: {
          $gte: date.from,
          $lte: date.to,
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        totalSales: { $sum: "$totalPrice" },
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $concat: [
            { $toString: "$_id.year" },
            "/",
            { $toString: "$_id.month" },
            "/",
            { $toString: "$_id.day" },
          ],
        },
        totalSales: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);

  return result;
}

async function getTopSalesMenuItems(
  date: DateRange,
  options?: { restaurantFilter?: Record<string, unknown> },
) {
  const restaurantFilter = options?.restaurantFilter ?? {};
  const result = await Order.aggregate([
    {
      $match: {
        ...restaurantFilter,
        createdAt: {
          $gte: date.from,
          $lte: date.to,
        },
      },
    },
    // Step 1: Unwind orderItems array
    { $unwind: "$items" },

    // Step 2: Group by menuItemId to calculate total sales per menuItem
    {
      $group: {
        _id: {
          name: "$items.name",
          image: "$items.image",
          _id: "$items.menuItem",
        },
        totalSales: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        }, // Assume quantity field in orderItems represents units sold
      },
    },
    {
      $sort: {
        totalSales: -1,
      },
    },
    { $limit: 6 },

    // Step 3: Replace menuItemInfo array with menuItem name and format the output
    {
      $project: {
        _id: 0,
        id: "$_id._id",
        label: "$_id.name",
        image: "$_id.image",
        value: "$totalSales",
      },
    },

    // Step 4: Sort by totalSales in descending order
    { $sort: { _id: 1 } },
  ]);

  return result;
}

async function getTopSalesCategories(
  date: DateRange,
  options?: { limit?: number; restaurantFilter?: Record<string, unknown> },
) {
  const restaurantFilter = options?.restaurantFilter ?? {};
  const limit = options?.limit ?? 5;
  const result = await Order.aggregate([
    {
      $match: {
        ...restaurantFilter,
        createdAt: {
          $gte: date.from,
          $lte: date.to,
        },
      },
    },
    // Step 1: Unwind orderItems array
    { $unwind: "$items" },
    // Step 2: Group by menuItemId to calculate total sales per menuItem
    {
      $group: {
        _id: "$items.category",
        totalSales: { $sum: "$items.quantity" }, // Assume quantity field in orderItems represents units sold
      },
    },
    // Step 3: Sort by totalSales in descending order
    { $sort: { totalSales: -1 } },
    // Step 4: Limit to top N menuItems
    { $limit: limit },
  ]);

  return result;
}

export async function markPaystackOrderAsPaid(
  orderId: string,
  paymentInfo: {
    id: string;
    status: string;
    email_address: string;
    pricePaid: string;
    paymentMethod?: string;
    paymentReference?: string;
    gateway?: string;
    currency?: string;
    paidAtGateway?: Date;
    channel?: string;
    authorization?: {
      card_type?: string;
      bank?: string;
      brand?: string;
      last4?: string;
      exp_month?: string;
      exp_year?: string;
    };
  },
) {
  try {
    if (
      !paymentInfo.id ||
      !paymentInfo.email_address ||
      !paymentInfo.pricePaid
    ) {
      throw new Error("Missing required payment information");
    }

    return await processOrderPayment(orderId, paymentInfo);
  } catch (err) {
    return { success: false, message: formatError(err) };
  }
}
