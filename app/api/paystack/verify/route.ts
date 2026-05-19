import { NextResponse } from "next/server";
import Order from "@/lib/db/models/order.model";
import { markPaystackOrderAsPaid } from "@/lib/actions/order.actions";
import { completeWalletTopup } from "@/lib/actions/wallet.actions";
import { payInstallment } from "@/lib/actions/installment.actions";
import { executeBNPLRepayment } from "@/lib/repayment-internal";
import { verifyPaystackTransaction } from "@/lib/paystack";
import Installment from "@/lib/db/models/installment.model";
import { processSubscriptionPayment } from "@/lib/actions/subscription.actions";

export async function POST(req: Request) {
  try {
    const { reference, orderId: bodyOrderId } = await req.json();

    const data = await verifyPaystackTransaction(reference);

    if (!data?.status || data.data.status !== "success") {
      return NextResponse.json({
        status: false,
        message: "Payment not successful",
      });
    }

    const metadata = data.data.metadata;
    const type = metadata?.type;

    if (type === "bnpl_repayment") {
      const orderId = metadata?.orderId;
      if (!orderId) {
        return NextResponse.json({
          status: false,
          message: "Missing orderId for verification",
        });
      }

      const customerEmail = data.data.customer?.email;
      const transactionId = data.data.id;
      const amount = data.data.amount; // amount in kobo/cents
      const gatewayPaidAt = data.data.paid_at
        ? new Date(data.data.paid_at)
        : undefined;

      if (!customerEmail || !transactionId || amount == null) {
        return NextResponse.json({
          status: false,
          message: "Incomplete payment data from Paystack",
        });
      }

      // BNPL Repayments use executeBNPLRepayment
      const result = await executeBNPLRepayment({
        orderId,
        amount: amount / 100, // Convert to major currency unit
        paymentMethod: "Mobile Money (M-Pesa / Airtel) & Card",
        reference,
        source: "paystack",
        paymentResult: {
          id: transactionId.toString(),
          status: "success",
          email_address: customerEmail,
          pricePaid: (amount / 100).toString(),
          paymentMethod: "Mobile Money (M-Pesa / Airtel) & Card",
          paymentReference: reference,
          gateway: "paystack",
          currency: data.data.currency,
          channel: data.data.channel,
          paidAtGateway: gatewayPaidAt,
          authorization: data.data.authorization,
        },
      });

      if (!result.success) {
        return NextResponse.json({
          status: false,
          message: result.message,
        });
      }

      return NextResponse.json({ status: true, data: data.data });
    }

    if (type === "installment_payment") {
      const installmentId = metadata?.installmentId;
      if (!installmentId) {
        return NextResponse.json({
          status: false,
          message: "Missing installmentId for verification",
        });
      }

      const installment = await Installment.findById(installmentId).select("amount").lean();
      if (!installment) {
        return NextResponse.json({
          status: false,
          message: "Installment not found for verification",
        });
      }

      const expectedAmount = Math.round(Number(installment.amount) * 100);
      const paidAmount = Number(data.data.amount);
      if (expectedAmount !== paidAmount) {
        return NextResponse.json({
          status: false,
          message: "Payment amount does not match installment amount",
        });
      }

      const customerEmail = data.data.customer?.email;
      const transactionId = data.data.id;
      const amount = data.data.amount;
      const gatewayPaidAt = data.data.paid_at ? new Date(data.data.paid_at) : undefined;

      if (!customerEmail || !transactionId || amount == null) {
        return NextResponse.json({
          status: false,
          message: "Incomplete payment data from Paystack",
        });
      }

      const result = await payInstallment(installmentId, {
        id: transactionId.toString(),
        status: "success",
        email_address: customerEmail,
        pricePaid: amount.toString(),
        paymentMethod: "Mobile Money (M-Pesa / Airtel) & Card",
        paymentReference: reference,
        gateway: "paystack",
        currency: data.data.currency,
        channel: data.data.channel,
        paidAtGateway: gatewayPaidAt,
        authorization: data.data.authorization
          ? {
              card_type: data.data.authorization.card_type,
              bank: data.data.authorization.bank,
              brand: data.data.authorization.brand,
              last4: data.data.authorization.last4,
              exp_month: data.data.authorization.exp_month,
              exp_year: data.data.authorization.exp_year,
            }
          : undefined,
      });

      if (!result.success) {
        return NextResponse.json({
          status: false,
          message: result.message,
        });
      }

      return NextResponse.json({ status: true, data: data.data });
    }

    if (type === "wallet_topup") {
      const result = await completeWalletTopup(reference, data);
      if (!result.success) {
        return NextResponse.json({
          status: false,
          message: result.message,
        });
      }
      return NextResponse.json({
        status: true,
        message: result.message,
        data: data.data,
      });
    }

    if (type === "membership_subscription") {
      const result = await processSubscriptionPayment(data);
      if (!result.success) {
        return NextResponse.json({
          status: false,
          message: result.message,
        });
      }
      return NextResponse.json({
        status: true,
        message: result.message,
        data: data.data,
      });
    }

    // Default to order payment if not wallet_topup or if type is explicitly 'order'
    const orderId = metadata?.orderId || bodyOrderId;

    if (!orderId) {
      return NextResponse.json({
        status: false,
        message: "Missing orderId for verification",
      });
    }

    const order = await Order.findById(orderId)
      .select("totalPrice paymentType remainingAmount")
      .lean();
    if (!order) {
      return NextResponse.json({
        status: false,
        message: "Order not found for verification",
      });
    }

    const paidAmount = Number(data.data.amount);
    const customerEmail = data.data.customer?.email;
    const transactionId = data.data.id;
    const gatewayPaidAt = data.data.paid_at
      ? new Date(data.data.paid_at)
      : undefined;

    if (!customerEmail || !transactionId || paidAmount == null) {
      return NextResponse.json({
        status: false,
        message: "Incomplete payment data from Paystack",
      });
    }

    const paymentResult = {
      id: transactionId.toString(),
      status: "success",
      email_address: customerEmail,
      pricePaid: (paidAmount / 100).toString(),
      paymentMethod: "Mobile Money (M-Pesa / Airtel) & Card",
      paymentReference: reference,
      gateway: "paystack",
      currency: data.data.currency,
      channel: data.data.channel,
      paidAtGateway: gatewayPaidAt,
      authorization: data.data.authorization
        ? {
            card_type: data.data.authorization.card_type,
            bank: data.data.authorization.bank,
            brand: data.data.authorization.brand,
            last4: data.data.authorization.last4,
            exp_month: data.data.authorization.exp_month,
            exp_year: data.data.authorization.exp_year,
          }
        : undefined,
    };

    // If it's a full order but the paid amount is less than total, we treat it as a BNPL repayment
    // OR if it's already a BNPL order, we use executeBNPLRepayment
    const expectedRemaining = Math.round(
      Number(order.remainingAmount ?? order.totalPrice) * 100,
    );

    if (
      order.paymentType === "bnpl" ||
      (order.paymentType === "full" && paidAmount < expectedRemaining)
    ) {
      const result = await executeBNPLRepayment({
        orderId,
        amount: paidAmount / 100,
        paymentMethod: "Mobile Money (M-Pesa / Airtel) & Card",
        reference,
        source: "paystack",
        paymentResult,
      });

      if (!result.success) {
        return NextResponse.json({ status: false, message: result.message });
      }

      return NextResponse.json({ status: true, data: data.data });
    }

    // Otherwise, validate it covers the remaining balance and mark as paid
    if (paidAmount < expectedRemaining) {
       // This shouldn't really happen due to the logic above, but for safety:
       return NextResponse.json({ status: false, message: "Payment amount too low" });
    }

    const result = await markPaystackOrderAsPaid(orderId, paymentResult);

    if (!result.success) {
      return NextResponse.json({
        status: false,
        message: result.message,
      });
    }

    return NextResponse.json({ status: true, data: data.data });
  } catch (error: unknown) {
    console.error("Verification error:", error);
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : "Verification failed";
    return NextResponse.json({
      status: false,
      message,
    });
  }
}
