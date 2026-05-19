"use server";

import { connectToDatabase } from "../db";
import Installment from "../db/models/installment.model";
import Order from "../db/models/order.model";
import { getServerSession } from "../get-session";
import { formatError, round2 } from "../utils";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

/**
 * @deprecated Use processBNPLRepayment from bnpl.actions.ts instead.
 */
export async function payInstallment(
  installmentId: string,
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
    await connectToDatabase();

    const installment = await Installment.findById(installmentId);
    if (!installment) throw new Error("Installment not found");
    if (installment.status === "paid")
      return { success: true, message: "Installment already paid" };

    const order = await Order.findById(installment.order);
    if (!order) throw new Error("Order not found");

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      installment.status = "paid";
      installment.paidAt = new Date();
      installment.paymentResult = paymentInfo;
      await installment.save({ session: dbSession });

      order.amountPaid = round2(order.amountPaid + installment.amount);
      order.remainingAmount = round2(order.totalPrice - order.amountPaid);

      if (order.remainingAmount <= 0) {
        order.paymentStatus = "paid";
        order.isPaid = true;
        order.paidAt = new Date();
      } else {
        order.paymentStatus = "partial";
      }

      await order.save({ session: dbSession });

      await dbSession.commitTransaction();
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }

    revalidatePath(`/account/orders/${order._id}`);
    return { success: true, message: "Installment paid successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getUserInstallments() {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session) throw new Error("Unauthorized");

    const installments = await Installment.find({ user: session.user.id })
      .populate("order", "trackingNumber totalPrice")
      .sort({ dueDate: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(installments)) };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getInstallmentsByOrderId(orderId: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session) throw new Error("Unauthorized");

    const query: any = { order: orderId };
    if (session.user.role !== "ADMIN") {
      query.user = session.user.id;
    }

    const installments = await Installment.find(query)
      .sort({ dueDate: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(installments)) };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
