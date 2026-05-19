"use server";

import { connectToDatabase } from "../db";
import BNPLPayment from "../db/models/bnpl-payment.model";
import Order from "../db/models/order.model";
import { formatError, round2 } from "../utils";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { calculateFinancingState } from "../bnpl";
import { executeBNPLRepayment } from "../repayment-internal";
import { runPostPaymentSideEffects } from "./order.actions";
import { getServerSession } from "../get-session";

export type BNPLPaymentListItem = {
  _id: string;
  createdAt: string;
  amount: number;
  type: string;
  paymentMethod: string;
  status: string;
  source: string;
  notes?: string;
  paymentResult?: Record<string, unknown>;
};

/**
 * Public server action for repayments via balance.
 * Enforces strict authorization and only allows safe sources.
 */
export async function processBNPLRepayment({
  orderId,
  amount,
  paymentMethod,
  source,
  accessToken,
}: {
  orderId: string;
  amount: number;
  paymentMethod: string;
  source: "wallet" | "coins";
  accessToken?: string;
}) {
  // Only allow specific sources from the client
  if (!["wallet", "coins"].includes(source)) {
    throw new Error("Invalid payment source");
  }

  // Generate unique reference for idempotency check
  const reference = `wallet_${source}_${orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  return executeBNPLRepayment({
    orderId,
    amount,
    paymentMethod,
    source,
    reference,
    accessToken,
  });
}

export async function getBNPLPaymentHistory(
  orderId: string,
  accessToken?: string,
): Promise<{ success: boolean; data?: BNPLPaymentListItem[]; message?: string }> {
  try {
    await connectToDatabase();
    const session = await getServerSession();

    const order = await Order
      .findById(orderId)
      .select("user isGuest accessToken");
    if (!order) throw new Error("Order not found");

    const isAdmin = session?.user?.role === "ADMIN";
    const isOwner =
      session?.user?.id && order.user?.toString() === session.user.id;
    const isGuestOwner = order.isGuest && order.accessToken === accessToken;

    if (!isAdmin && !isOwner && !isGuestOwner) {
      throw new Error("Unauthorized");
    }

    const projection = isAdmin ? {} : { paymentResult: 0 };
    const payments = await BNPLPayment.find({ order: orderId }, projection)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(payments)) as BNPLPaymentListItem[],
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function recordManualBNPLRepayment(
  orderId: string,
  amount: number,
  notes: string,
) {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  return executeBNPLRepayment({
    orderId,
    amount,
    paymentMethod: "Manual Admin Entry",
    source: "manual",
    notes,
  });
}

export async function adjustBNPLFinancing(
  orderId: string,
  action: "waive" | "suspend" | "reactivate" | "extend",
  data?: { amount?: number; dueDate?: Date; notes?: string }
) {
  try {
    await connectToDatabase();
    const adminSession = await getServerSession();
    if (adminSession?.user?.role !== "ADMIN") throw new Error("Unauthorized");

    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let logType: "adjustment" | "waiver" = "adjustment";
      let logNotes = data?.notes || `Admin action: ${action}`;

      if (action === "waive") {
        const waiveAmount = data?.amount || order.remainingAmount;
        if (waiveAmount > order.remainingAmount) throw new Error("Cannot waive more than remaining balance");

        order.amountPaid = round2(order.amountPaid + waiveAmount);
        order.remainingAmount = round2(order.totalPrice - order.amountPaid);
        logType = "waiver";
        logNotes = `Waived ${waiveAmount}. ${logNotes}`;

        if (order.remainingAmount <= 0) {
          order.paymentStatus = "paid";
          order.isPaid = true;
          order.financingStatus = "completed";
        }
      } else if (action === "suspend") {
        order.financingStatus = "suspended";
      } else if (action === "reactivate") {
        const state = calculateFinancingState(order);
        order.financingStatus = state.status;
        if (order.financingStatus === "overdue") {
          order.paymentStatus = "overdue";
        } else if (order.remainingAmount > 0) {
          order.paymentStatus = order.amountPaid > 0 ? "partial" : "pending";
        }
      } else if (action === "extend" && data?.dueDate) {
        order.bnplDueDate = data.dueDate;
        const state = calculateFinancingState(order);
        order.financingStatus = state.status;
        if (order.financingStatus === "overdue") {
          order.paymentStatus = "overdue";
        } else if (order.remainingAmount > 0) {
          order.paymentStatus = order.amountPaid > 0 ? "partial" : "pending";
        }
      }

      await BNPLPayment.create(
        [
          {
            order: orderId,
            user: order.user,
            amount: action === "waive" ? (data?.amount || 0) : 0,
            paymentMethod: "Admin Adjustment",
            status: "success",
            type: logType,
            source: "manual",
            notes: logNotes,
            processedBy: "admin",
          },
        ],
        { session }
      );

      await order.save({ session });
      await session.commitTransaction();

      if (order.remainingAmount <= 0) {
        await runPostPaymentSideEffects(orderId.toString());
      }

      revalidatePath(`/admin/orders/${orderId}`);
      return { success: true, message: `Financing ${action}ed successfully` };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function refreshOrderFinancingState(orderId: string) {
  try {
    await connectToDatabase();
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const state = calculateFinancingState(order);
    order.financingStatus = state.status;
    order.repaymentProgress = state.progress;
    order.overdueDays = state.overdueDays;
    order.remainingAmount = state.remainingAmount;

    // Sync paymentStatus
    if (order.remainingAmount <= 0) {
      order.paymentStatus = "paid";
      order.isPaid = true;
    } else if (order.financingStatus === "overdue") {
      order.paymentStatus = "overdue";
    } else {
      order.paymentStatus = order.amountPaid > 0 ? "partial" : "pending";
    }

    await order.save();
    return { success: true, data: order.financingStatus };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
