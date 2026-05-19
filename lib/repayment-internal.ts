import { connectToDatabase } from "./db";
import BNPLPayment from "./db/models/bnpl-payment.model";
import Order from "./db/models/order.model";
import User from "./db/models/user.model";
import CoinTransaction from "./db/models/coin-transaction.model";
import WalletTransaction from "./db/models/wallet-transaction.model";
import { getServerSession } from "./get-session";
import { formatError, round2 } from "./utils";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { calculateFinancingState, calculateNextSuggestedPayment } from "./bnpl";
import { sendBNPLRepaymentSuccessEmail } from "./email/transactional";
import { runPostPaymentSideEffects } from "./actions/order.actions";
import { ensureWishlistIsArray } from "./actions/wishlist.actions";

/**
 * Internal repayment processor.
 * Not intended to be called directly from the client.
 */
export async function executeBNPLRepayment({
  orderId,
  amount,
  paymentMethod,
  reference,
  source,
  notes,
  paymentResult,
  accessToken, // Used for guest order authorization
}: {
  orderId: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  source: "paystack" | "wallet" | "coins" | "manual" | "system";
  notes?: string;
  paymentResult?: Record<string, unknown>;
  accessToken?: string;
}) {
  try {
    await connectToDatabase();
    const session = await getServerSession();

    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    // Authorization
    const isAdmin = session?.user?.role === "ADMIN";
    const isOwner =
      session?.user?.id && order.user?.toString() === session.user.id;
    const isGuestOwner = order.isGuest && order.accessToken === accessToken;

    // source "paystack" and "system" are trusted contexts (webhooks/internal)
    const isTrustedSource = source === "paystack" || source === "system";

    if (!isAdmin && !isOwner && !isGuestOwner && !isTrustedSource) {
      throw new Error("Unauthorized");
    }

    // Validation
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid payment amount");
    }
    const normalizedAmount = round2(amount);

    if (order.paymentType !== "bnpl" && order.paymentType !== "full") {
      throw new Error("Invalid order payment type");
    }

    // Prevent payments on cancelled orders
    if (
      order.status === "cancelled" ||
      order.paymentStatus === "cancelled" ||
      order.financingStatus === "cancelled"
    ) {
      throw new Error("This order has been cancelled.");
    }

    // Check for existing payment with the same reference (Idempotency)
    if (reference && source) {
      const existingPayment = await BNPLPayment.findOne({
        order: orderId,
        source,
        reference,
        status: "success",
      });
      if (existingPayment) {
        return {
          success: true,
          message: "Payment already processed",
          data: JSON.parse(JSON.stringify(existingPayment)),
        };
      }
    }

    const remainingAmount = order.remainingAmount ?? (order.totalPrice - (order.amountPaid || 0));
    if (remainingAmount <= 0 || order.paymentStatus === "paid" || order.isPaid)
      return { success: true, message: "This financing plan is already settled." };

    if (normalizedAmount > remainingAmount) {
      throw new Error(
        `Payment amount (${normalizedAmount}) exceeds remaining balance (${remainingAmount})`,
      );
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // 0. Deduct from balance if source is wallet or coins
      if (source === "wallet" || source === "coins") {
        if (order.user) {
          await ensureWishlistIsArray(order.user.toString());
        }

        const user = await User.findById(order.user).session(dbSession);
        if (!user) throw new Error("User not found");

        if (source === "wallet") {
          if (user.walletBalance < normalizedAmount)
            throw new Error("Insufficient wallet balance");
          const balanceBefore = round2(user.walletBalance);
          user.walletBalance = round2(user.walletBalance - normalizedAmount);
          await user.save({ session: dbSession });
          const balanceAfter = round2(user.walletBalance);

          await WalletTransaction.create(
            [
              {
                user: user._id,
                order: order._id,
                amount: -normalizedAmount,
                reason: `Repayment for order #${order.trackingNumber || order._id.toString().slice(-6)}`,
                source: "wallet_payment",
                balanceBefore,
                balanceAfter,
              },
            ],
            { session: dbSession },
          );
        } else if (source === "coins") {
          if (user.coins < normalizedAmount)
            throw new Error("Insufficient coins balance");
          const balanceBefore = round2(user.coins);
          user.coins = round2(user.coins - normalizedAmount);
          await user.save({ session: dbSession });
          const balanceAfter = round2(user.coins);

          await CoinTransaction.create(
            [
              {
                user: user._id,
                order: order._id,
                amount: -normalizedAmount,
                reason: `Repayment for order #${order.trackingNumber || order._id.toString().slice(-6)}`,
                source: "system",
                balanceBefore,
                balanceAfter,
              },
            ],
            { session: dbSession },
          );
        }
      }

      // 1. Create Payment Record
      const [payment] = await BNPLPayment.create(
        [
          {
            order: orderId,
            user: order.user,
            amount: normalizedAmount,
            paymentMethod,
            reference,
            status: "success",
            type: "repayment",
            source,
            notes,
            paymentResult,
            processedBy: source === "manual" ? "admin" : "customer",
          },
        ],
        { session: dbSession },
      );

      // 2. Update Order Totals
      order.amountPaid = round2((order.amountPaid || 0) + normalizedAmount);
      order.remainingAmount = round2(order.totalPrice - order.amountPaid);
      order.lastPaymentAt = new Date();
      order.totalRepayments = (order.totalRepayments || 0) + 1;

      // 3. Update Financing State
      const state = calculateFinancingState(order as unknown as Parameters<typeof calculateFinancingState>[0]);
      order.financingStatus = state.status;
      order.repaymentProgress = state.progress;
      order.overdueDays = state.overdueDays;
      order.minimumPayment = calculateNextSuggestedPayment({
        totalPrice: order.totalPrice,
        amountPaid: order.amountPaid,
        remainingAmount: order.remainingAmount,
        minimumPayment: order.minimumPayment,
      });

      if (order.remainingAmount <= 0) {
        order.paymentStatus = "paid";
        order.isPaid = true;
        order.paidAt = new Date();
        order.financingStatus = "completed";
      } else {
        // If it was a full order and we paid partially, transition to BNPL tracking
        if (order.paymentType === "full") {
          order.paymentType = "bnpl";
          if (!order.bnplDueDate) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 90);
            order.bnplDueDate = dueDate;
          }
          if (!order.financingStatus) order.financingStatus = "active";
          if (!order.minimumPayment)
            order.minimumPayment = round2(order.totalPrice / 3);
        }

        if (order.financingStatus === "overdue") {
          order.paymentStatus = "overdue";
        } else {
          order.paymentStatus = "partial";
        }
      }

      await order.save({ session: dbSession });

      await dbSession.commitTransaction();

      if (order.remainingAmount <= 0) {
        await runPostPaymentSideEffects(orderId.toString());
      }

      // Send repayment success email (non-blocking)
      sendBNPLRepaymentSuccessEmail(
        order as unknown as Parameters<typeof sendBNPLRepaymentSuccessEmail>[0],
        normalizedAmount,
      ).catch((err) =>
        console.error("Failed to send BNPL success email:", err),
      );

      revalidatePath(`/account/orders/${orderId}`);
      revalidatePath(`/admin/orders/${orderId}`);

      return {
        success: true,
        message: "Repayment processed successfully",
        data: JSON.parse(JSON.stringify(payment)),
      };
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
