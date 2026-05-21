import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { randomUUID } from "crypto";

import { connectToDatabase } from "@/lib/db";
import PaystackWebhookEvent from "@/lib/db/models/paystack-webhook-event.model";
import Order from "@/lib/db/models/order.model";
import { markPaystackOrderAsPaid } from "@/lib/actions/order.actions";
import { handlePaystackTransferWebhook } from "@/lib/actions/restaurant-finance.actions";

const isSignatureValid = (rawBody: string, signature: string) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
};

const toEventId = (payload: any) => {
  const event = String(payload?.event || "unknown");
  const core =
    payload?.data?.id ||
    payload?.data?.reference ||
    payload?.data?.transfer_code ||
    payload?.data?.recipient_code ||
    randomUUID();
  return `${event}:${String(core)}`;
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    if (!signature || !isSignatureValid(rawBody, signature)) {
      return NextResponse.json(
        { ok: false, message: "Invalid signature" },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody);
    const event = String(payload?.event || "");
    const data = payload?.data || {};
    const eventId = toEventId(payload);

    await connectToDatabase();

    const alreadyProcessed = await PaystackWebhookEvent.findOne({ eventId })
      .select("_id")
      .lean();
    if (alreadyProcessed) {
      return NextResponse.json({ ok: true, message: "Already processed" });
    }

    if (event === "charge.success") {
      const metadata = data?.metadata || {};
      const type = metadata?.type;

      if (type === "bnpl_repayment" || type === "installment_payment") {
        await PaystackWebhookEvent.create({
          event,
          eventId,
          reference: data?.reference,
          payload,
          processedAt: new Date(),
        });

        return NextResponse.json({
          ok: true,
          message: "Ignored deprecated BNPL webhook",
        });
      }

      const orderId = metadata?.orderId;
      if (orderId) {
        const order = await Order.findById(orderId)
          .select("_id totalPrice isPaid")
          .lean();

        if (order && !order.isPaid) {
          const paidAmount = Number(data?.amount || 0);
          const expectedAmount = Math.round(Number(order.totalPrice || 0) * 100);

          if (paidAmount >= expectedAmount) {
            await markPaystackOrderAsPaid(orderId, {
              id: String(data?.id || ""),
              status: "success",
              email_address: String(data?.customer?.email || ""),
              pricePaid: (paidAmount / 100).toString(),
              paymentMethod: "Mobile Money (M-Pesa / Airtel) & Card",
              paymentReference: String(data?.reference || ""),
              gateway: "paystack",
              currency: data?.currency,
              channel: data?.channel,
              paidAtGateway: data?.paid_at ? new Date(data.paid_at) : undefined,
              authorization: data?.authorization
                ? {
                    card_type: data.authorization.card_type,
                    bank: data.authorization.bank,
                    brand: data.authorization.brand,
                    last4: data.authorization.last4,
                    exp_month: data.authorization.exp_month,
                    exp_year: data.authorization.exp_year,
                  }
                : undefined,
            });
          }
        }
      }
    }

    if (
      event === "transfer.success" ||
      event === "transfer.failed" ||
      event === "transfer.reversed"
    ) {
      await handlePaystackTransferWebhook(data);
    }

    await PaystackWebhookEvent.create({
      event,
      eventId,
      reference: data?.reference || data?.transfer_code,
      payload,
      processedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Paystack webhook processing error", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Webhook processing failed" },
      { status: 500 },
    );
  }
}
