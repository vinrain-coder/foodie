import { NextResponse } from "next/server";
import Order from "@/lib/db/models/order.model";
import { markPaystackOrderAsPaid } from "@/lib/actions/order.actions";
import { completeWalletTopup } from "@/lib/actions/wallet.actions";
import { verifyPaystackTransaction } from "@/lib/paystack";
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

    if (type === "bnpl_repayment" || type === "installment_payment") {
      return NextResponse.json({
        status: false,
        message: "BNPL and installment payments are no longer supported.",
      });
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

    const orderId = metadata?.orderId || bodyOrderId;

    if (!orderId) {
      return NextResponse.json({
        status: false,
        message: "Missing orderId for verification",
      });
    }

    const order = await Order.findById(orderId).select("totalPrice").lean();
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

    const expectedAmount = Math.round(Number(order.totalPrice) * 100);
    if (paidAmount < expectedAmount) {
      return NextResponse.json({
        status: false,
        message: "Payment amount too low",
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
