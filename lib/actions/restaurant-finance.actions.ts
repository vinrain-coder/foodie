"use server";

import { revalidatePath, updateTag } from "next/cache";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { getStaffScope } from "@/lib/staff-scope";
import { isAdminRole } from "@/lib/dashboard-access";
import { formatError, round2 } from "@/lib/utils";
import { getSetting } from "./setting.actions";
import { sendAdminEventNotification } from "@/lib/email/transactional";

import Restaurant from "@/lib/db/models/restaurant.model";
import Order from "@/lib/db/models/order.model";
import RestaurantBalance from "@/lib/db/models/restaurant-balance.model";
import RestaurantLedgerEntry from "@/lib/db/models/restaurant-ledger-entry.model";
import RestaurantPayout from "@/lib/db/models/restaurant-payout.model";
import RestaurantPayoutAccount from "@/lib/db/models/restaurant-payout-account.model";

import {
  computeRestaurantSettlementBreakdown,
  getPaymentMethodCommissionRate,
  getRestaurantSettlementPolicy,
} from "@/lib/restaurant-settlement";
import {
  createPaystackTransferRecipient,
  initiatePaystackTransfer,
  maskDestination,
} from "@/lib/paystack-transfers";

type NormalizedPayoutMethod =
  | "bank_transfer"
  | "mpesa_number"
  | "mpesa_till"
  | "mpesa_paybill";

const normalizePayoutMethod = (value?: string | null): NormalizedPayoutMethod => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "bank" || normalized === "bank_transfer") {
    return "bank_transfer";
  }
  if (normalized === "mobile_money" || normalized === "mpesa_number") {
    return "mpesa_number";
  }
  if (normalized === "mpesa_till") {
    return "mpesa_till";
  }
  if (normalized === "mpesa_paybill") {
    return "mpesa_paybill";
  }
  return "bank_transfer";
};

const payoutMethodLabel = (method?: string | null) => {
  const normalized = normalizePayoutMethod(method);
  if (normalized === "mpesa_number") return "M-Pesa Number";
  if (normalized === "mpesa_till") return "M-Pesa Till";
  if (normalized === "mpesa_paybill") return "M-Pesa Paybill";
  return "Bank Transfer";
};

const isPaystackAutoMethod = (method: NormalizedPayoutMethod) =>
  method === "bank_transfer" ||
  method === "mpesa_number" ||
  method === "mpesa_till" ||
  method === "mpesa_paybill";

const normalizePhoneLike = (value?: string) =>
  String(value || "").replace(/[^\d+]/g, "").trim();

const resolvePayoutDestination = (account: {
  payoutMethod?: string;
  accountNumber?: string;
  mobileMoneyNumber?: string;
  mpesaTillNumber?: string;
  mpesaPaybillNumber?: string;
}) => {
  const method = normalizePayoutMethod(account.payoutMethod);
  if (method === "bank_transfer") return account.accountNumber || "";
  if (method === "mpesa_number")
    return normalizePhoneLike(account.mobileMoneyNumber || account.accountNumber || "");
  if (method === "mpesa_till") return String(account.mpesaTillNumber || "");
  return String(account.mpesaPaybillNumber || "");
};

const resolveAccountReferenceForMethod = ({
  payoutMethod,
  paybillAccountNumber,
  fallbackId,
}: {
  payoutMethod: string;
  paybillAccountNumber?: string;
  fallbackId: string;
}) => {
  const method = normalizePayoutMethod(payoutMethod);
  if (method === "mpesa_paybill") {
    return String(paybillAccountNumber || "").trim();
  }
  if (method === "mpesa_till") {
    return `till-${fallbackId}`;
  }
  return "";
};

const payoutAccountInputSchema = z
  .object({
    payoutMethod: z.enum([
      "bank_transfer",
      "mpesa_number",
      "mpesa_till",
      "mpesa_paybill",
    ]),
    accountName: z.preprocess(
      (value) => {
        const text = String(value ?? "").trim();
        return text.length ? text : undefined;
      },
      z.string().min(2).max(120).optional(),
    ),
    bankName: z.string().trim().optional(),
    accountNumber: z.string().trim().optional(),
    bankCode: z.string().trim().optional(),
    mobileMoneyNumber: z.string().trim().optional(),
    mpesaTillNumber: z.string().trim().optional(),
    mpesaPaybillNumber: z.string().trim().optional(),
    paybillAccountNumber: z.string().trim().optional(),
    paystackRecipientCode: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payoutMethod === "bank_transfer") {
      if (!data.accountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accountNumber"],
          message: "Account number is required for bank payouts",
        });
      }
      if (!data.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bankName"],
          message: "Bank name is required for bank payouts",
        });
      }
      if (!data.bankCode && !data.paystackRecipientCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bankCode"],
          message: "Bank code is required unless recipient code is provided",
        });
      }
    }

    if (data.payoutMethod === "mpesa_number") {
      if (!normalizePhoneLike(data.mobileMoneyNumber || data.accountNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mobileMoneyNumber"],
          message: "M-Pesa number is required",
        });
      }
    }

    if (data.payoutMethod === "mpesa_till") {
      if (!data.mpesaTillNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mpesaTillNumber"],
          message: "M-Pesa till number is required",
        });
      }
    }

    if (data.payoutMethod === "mpesa_paybill") {
      if (!data.mpesaPaybillNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mpesaPaybillNumber"],
          message: "M-Pesa paybill number is required",
        });
      }
      if (!data.paybillAccountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paybillAccountNumber"],
          message: "Paybill account number is required",
        });
      }
    }
  });

const payoutRequestInputSchema = z.object({
  amount: z.coerce.number().positive(),
});

const adminPayoutDecisionSchema = z.object({
  payoutId: z.string().min(1),
  decision: z.enum(["pay", "reject"]),
  adminNote: z.string().trim().max(280).optional(),
  paymentReference: z.string().trim().max(120).optional(),
});

const normalizeId = (value: unknown) => {
  const id = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
};

const ensureRestaurantBalance = async (
  restaurantId: string,
  session?: mongoose.ClientSession,
) => {
  const existing = await RestaurantBalance.findOne({
    restaurant: new mongoose.Types.ObjectId(restaurantId),
  }).session(session || null);

  if (existing) return existing;

  const created = await RestaurantBalance.create(
    [
      {
        restaurant: new mongoose.Types.ObjectId(restaurantId),
      },
    ],
    session ? { session } : undefined,
  );

  return created[0];
};

export async function releaseMaturedPendingRestaurantBalance(
  restaurantId: string,
  existingSession?: mongoose.ClientSession,
) {
  const normalizedRestaurantId = normalizeId(restaurantId);
  if (!normalizedRestaurantId) {
    return { releasedAmount: 0, releasedEntries: 0 };
  }

  const now = new Date();

  const runRelease = async (session?: mongoose.ClientSession) => {
    const pendingEntries = await RestaurantLedgerEntry.find({
      restaurant: new mongoose.Types.ObjectId(normalizedRestaurantId),
      type: "order_capture",
      settlementState: "pending",
      availableOn: { $lte: now },
    })
      .session(session || null)
      .select("_id amount")
      .lean();

    if (pendingEntries.length === 0) {
      return { releasedAmount: 0, releasedEntries: 0 };
    }

    const releasedAmount = round2(
      pendingEntries.reduce((acc, entry) => acc + Number(entry.amount || 0), 0),
    );

    await RestaurantLedgerEntry.updateMany(
      {
        _id: { $in: pendingEntries.map((entry) => entry._id) },
        settlementState: "pending",
      },
      {
        $set: {
          settlementState: "available",
          releasedAt: now,
        },
      },
      session ? { session } : undefined,
    );

    await ensureRestaurantBalance(normalizedRestaurantId, session);

    await RestaurantBalance.updateOne(
      { restaurant: new mongoose.Types.ObjectId(normalizedRestaurantId) },
      {
        $inc: {
          pendingBalance: -releasedAmount,
          availableBalance: releasedAmount,
        },
      },
      session ? { session } : undefined,
    );

    return { releasedAmount, releasedEntries: pendingEntries.length };
  };

  if (existingSession) {
    return runRelease(existingSession);
  }

  const connection = await connectToDatabase();
  const session = await connection.startSession();

  try {
    let result = { releasedAmount: 0, releasedEntries: 0 };
    await session.withTransaction(async () => {
      result = await runRelease(session);
    });
    return result;
  } finally {
    session.endSession();
  }
}

export async function recordRestaurantSettlementForPaidOrder(orderId: string) {
  try {
    await connectToDatabase();

    const normalizedOrderId = normalizeId(orderId);
    if (!normalizedOrderId) {
      return { success: false, message: "Invalid order id" };
    }

    const order = await Order.findById(normalizedOrderId)
      .select(
        "_id restaurant isPaid itemsPrice shippingPrice paymentMethod coupon totalPrice",
      )
      .lean();

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    if (!order.isPaid) {
      return { success: false, message: "Order is not paid" };
    }

    const restaurantId = normalizeId(order.restaurant);
    if (!restaurantId) {
      return {
        success: true,
        message: "Order has no restaurant; no settlement entry required",
      };
    }

    const existing = await RestaurantLedgerEntry.findOne({
      order: order._id,
      type: "order_capture",
    })
      .select("_id")
      .lean();

    if (existing) {
      return { success: true, message: "Settlement already recorded" };
    }

    const setting = await getSetting();
    const policy = getRestaurantSettlementPolicy();
    const commissionRate = getPaymentMethodCommissionRate(
      order.paymentMethod,
      setting,
    );

    const discountAmount = Number(order.coupon?.discountAmount || 0);

    const breakdown = computeRestaurantSettlementBreakdown({
      itemsPrice: Number(order.itemsPrice || 0),
      shippingPrice: Number(order.shippingPrice || 0),
      discountAmount,
      commissionRate,
      policy,
    });

    const captureAmount = round2(breakdown.restaurantAmount);
    if (captureAmount <= 0) {
      return {
        success: true,
        message: "Restaurant payout share is zero; nothing to capture",
      };
    }

    const now = new Date();
    const availableOn = new Date(
      now.getTime() + policy.holdPeriodHours * 60 * 60 * 1000,
    );
    const settlementState =
      policy.holdPeriodHours > 0 ? "pending" : "available";

    const connection = await connectToDatabase();
    const session = await connection.startSession();

    await session.withTransaction(async () => {
      await RestaurantLedgerEntry.create(
        [
          {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            order: order._id,
            type: "order_capture",
            amount: captureAmount,
            currency: policy.currency,
            settlementState,
            availableOn,
            source: "order",
            reference: `order:${order._id.toString()}:capture`,
            breakdown,
            notes: `Auto-captured from paid order ${order._id.toString()}`,
          },
        ],
        { session },
      );

      await ensureRestaurantBalance(restaurantId, session);

      await RestaurantBalance.updateOne(
        { restaurant: new mongoose.Types.ObjectId(restaurantId) },
        {
          $inc: {
            pendingBalance: settlementState === "pending" ? captureAmount : 0,
            availableBalance:
              settlementState === "available" ? captureAmount : 0,
            lifetimeGross: round2(breakdown.netItems + breakdown.deliveryFee),
            lifetimeCommission: breakdown.commissionAmount,
            lifetimeNet: captureAmount,
          },
        },
        { session },
      );
    });

    session.endSession();

    updateTag("restaurantFinance");
    revalidatePath("/admin/restaurant-payouts");
    revalidatePath("/restaurant-admin/finance");

    return {
      success: true,
      message: "Restaurant settlement captured",
      data: breakdown,
    };
  } catch (error) {
    const isDup =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000;
    if (isDup) {
      return { success: true, message: "Settlement already recorded" };
    }
    return { success: false, message: formatError(error) };
  }
}

export async function reverseRestaurantSettlementForOrder({
  orderId,
  reason,
}: {
  orderId: string;
  reason?: string;
}) {
  try {
    await connectToDatabase();

    const normalizedOrderId = normalizeId(orderId);
    if (!normalizedOrderId) {
      return { success: false, message: "Invalid order id" };
    }

    const capture = await RestaurantLedgerEntry.findOne({
      order: new mongoose.Types.ObjectId(normalizedOrderId),
      type: "order_capture",
    });

    if (!capture) {
      return { success: true, message: "No settlement capture to reverse" };
    }

    if (capture.settlementState === "reversed") {
      return { success: true, message: "Settlement already reversed" };
    }

    const existingReversal = await RestaurantLedgerEntry.findOne({
      order: capture.order,
      type: "order_reversal",
    })
      .select("_id")
      .lean();

    if (existingReversal) {
      return { success: true, message: "Settlement already reversed" };
    }

    const connection = await connectToDatabase();
    const session = await connection.startSession();
    const now = new Date();

    await session.withTransaction(async () => {
      await RestaurantLedgerEntry.create(
        [
          {
            restaurant: capture.restaurant,
            order: capture.order,
            type: "order_reversal",
            amount: -Math.abs(Number(capture.amount || 0)),
            currency: capture.currency,
            settlementState: "reversed",
            reversedAt: now,
            source: "system",
            reference: `order:${capture.order?.toString()}:reversal`,
            notes: reason || "Order cancelled or reversed",
            breakdown: capture.breakdown,
          },
        ],
        { session },
      );

      const previousState = capture.settlementState;
      capture.settlementState = "reversed";
      capture.reversedAt = now;
      await capture.save({ session });

      await ensureRestaurantBalance(capture.restaurant.toString(), session);

      const amount = Math.abs(Number(capture.amount || 0));
      const pendingDelta = previousState === "pending" ? -amount : 0;
      const availableDelta = previousState === "available" ? -amount : 0;

      await RestaurantBalance.updateOne(
        { restaurant: capture.restaurant },
        {
          $inc: {
            pendingBalance: pendingDelta,
            availableBalance: availableDelta,
            lifetimeGross: -round2(
              Number(capture.breakdown?.netItems || 0) +
                Number(capture.breakdown?.deliveryFee || 0),
            ),
            lifetimeCommission: -round2(
              Number(capture.breakdown?.commissionAmount || 0),
            ),
            lifetimeNet: -amount,
          },
        },
        { session },
      );
    });

    session.endSession();

    updateTag("restaurantFinance");
    revalidatePath("/admin/restaurant-payouts");
    revalidatePath("/restaurant-admin/finance");

    return { success: true, message: "Restaurant settlement reversed" };
  } catch (error) {
    const isDup =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000;
    if (isDup) {
      return { success: true, message: "Settlement already reversed" };
    }
    return { success: false, message: formatError(error) };
  }
}

export async function upsertRestaurantPayoutAccount(input: unknown) {
  try {
    await connectToDatabase();
    const scope = await getStaffScope();
    if (scope.role !== "RESTAURANT") throw new Error("Unauthorized");

    const parsed = payoutAccountInputSchema.parse(input);

    const restaurant = await Restaurant.findById(scope.restaurantId)
      .select("_id name")
      .lean();
    if (!restaurant) throw new Error("Restaurant not found");
    const recipientName =
      String(parsed.accountName || "").trim() ||
      String(restaurant.name || "").trim() ||
      "Restaurant Payout";

    const payoutMethod = normalizePayoutMethod(parsed.payoutMethod);
    let recipientCode = parsed.paystackRecipientCode || "";
    let recipientType = "";

    if (!recipientCode && isPaystackAutoMethod(payoutMethod)) {
      const shouldAutoCreateRecipient =
        (process.env.RESTAURANT_AUTO_CREATE_RECIPIENT || "true")
          .trim()
          .toLowerCase() !== "false";

      if (shouldAutoCreateRecipient) {
        let recipientPayload:
          | Parameters<typeof createPaystackTransferRecipient>[0]
          | undefined;

        if (payoutMethod === "bank_transfer") {
          recipientPayload = {
            type: "kepss",
            name: recipientName,
            account_number: parsed.accountNumber!,
            bank_code: parsed.bankCode!,
            currency: getRestaurantSettlementPolicy().currency,
            metadata: {
              restaurantId: restaurant._id.toString(),
              restaurantName: restaurant.name,
              payoutMethod,
            },
          };
        } else if (payoutMethod === "mpesa_number") {
          recipientPayload = {
            type: "mobile_money",
            name: recipientName,
            account_number: normalizePhoneLike(
              parsed.mobileMoneyNumber || parsed.accountNumber,
            ),
            bank_code: "MPESA",
            currency: getRestaurantSettlementPolicy().currency,
            metadata: {
              restaurantId: restaurant._id.toString(),
              restaurantName: restaurant.name,
              payoutMethod,
            },
          };
        } else if (payoutMethod === "mpesa_till") {
          recipientPayload = {
            type: "mobile_money_business",
            name: recipientName,
            account_number: parsed.mpesaTillNumber!,
            bank_code: "MPTILL",
            currency: getRestaurantSettlementPolicy().currency,
            metadata: {
              restaurantId: restaurant._id.toString(),
              restaurantName: restaurant.name,
              payoutMethod,
            },
          };
        } else if (payoutMethod === "mpesa_paybill") {
          recipientPayload = {
            type: "mobile_money_business",
            name: recipientName,
            account_number: parsed.mpesaPaybillNumber!,
            bank_code: "MPPAYBILL",
            currency: getRestaurantSettlementPolicy().currency,
            metadata: {
              restaurantId: restaurant._id.toString(),
              restaurantName: restaurant.name,
              payoutMethod,
            },
          };
        }

        if (recipientPayload) {
          const recipient = await createPaystackTransferRecipient(recipientPayload);
          recipientCode = recipient.recipient_code;
          recipientType = recipient.type;
        }
      }
    }

    await RestaurantPayoutAccount.findOneAndUpdate(
      { restaurant: restaurant._id },
      {
        payoutMethod,
        accountName: recipientName,
        bankName: parsed.bankName,
        accountNumber: parsed.accountNumber,
        bankCode: parsed.bankCode,
        mobileMoneyNumber: normalizePhoneLike(
          parsed.mobileMoneyNumber || parsed.accountNumber,
        ),
        mpesaTillNumber: parsed.mpesaTillNumber,
        mpesaPaybillNumber: parsed.mpesaPaybillNumber,
        paybillAccountNumber: parsed.paybillAccountNumber,
        paystackRecipientCode: recipientCode || undefined,
        recipientType: recipientType || undefined,
        isVerified: payoutMethod === "mpesa_paybill"
          ? Boolean(recipientCode && parsed.paybillAccountNumber)
          : Boolean(recipientCode),
        verifiedAt: recipientCode ? new Date() : undefined,
        metadata: {
          payoutMethodLabel: payoutMethodLabel(payoutMethod),
        },
      },
      { upsert: true, new: true },
    );

    updateTag("restaurantFinance");
    revalidatePath("/restaurant-admin/finance");

    return {
      success: true,
      message: "Payout account saved successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function requestRestaurantPayout(input: unknown) {
  const connection = await connectToDatabase();
  const session = await connection.startSession();

  try {
    const scope = await getStaffScope();
    if (scope.role !== "RESTAURANT") throw new Error("Unauthorized");

    const parsed = payoutRequestInputSchema.parse(input);
    const policy = getRestaurantSettlementPolicy();

    const requestedAmount = round2(Number(parsed.amount || 0));
    if (requestedAmount < policy.minPayoutAmount) {
      throw new Error(
        `Minimum payout amount is ${policy.minPayoutAmount.toFixed(2)} ${policy.currency}`,
      );
    }

    await releaseMaturedPendingRestaurantBalance(scope.restaurantId, session);

    const restaurant = await Restaurant.findById(scope.restaurantId)
      .session(session)
      .select("_id name")
      .lean();
    if (!restaurant) throw new Error("Restaurant not found");

    const payoutAccount = await RestaurantPayoutAccount.findOne({
      restaurant: restaurant._id,
    })
      .session(session)
      .lean();

    if (!payoutAccount) {
      throw new Error("Set up payout details first");
    }

    const normalizedMethod = normalizePayoutMethod(payoutAccount.payoutMethod);
    const destinationRaw = resolvePayoutDestination(payoutAccount);
    if (!destinationRaw) {
      throw new Error("Payout destination details are incomplete");
    }

    const accountReference = resolveAccountReferenceForMethod({
      payoutMethod: normalizedMethod,
      paybillAccountNumber: payoutAccount.paybillAccountNumber,
      fallbackId: randomUUID().slice(0, 12),
    });
    if (
      normalizedMethod === "mpesa_paybill" &&
      !String(accountReference || "").trim()
    ) {
      throw new Error("Paybill account number is required for M-Pesa paybill payouts");
    }

    const balance = await ensureRestaurantBalance(scope.restaurantId, session);
    if (requestedAmount > round2(Number(balance.availableBalance || 0))) {
      throw new Error("Insufficient available balance for payout request");
    }

    const idempotencyKey = `rp_${restaurant._id.toString()}_${randomUUID()}`;

    const payout = await RestaurantPayout.create(
      [
        {
          restaurant: restaurant._id,
          amount: requestedAmount,
          currency: policy.currency,
          status: "pending",
          requestedBy: new mongoose.Types.ObjectId(scope.userId),
          payoutMethod: normalizedMethod,
          destinationMasked: maskDestination(destinationRaw),
          accountReference: accountReference || undefined,
          paystackRecipientCode: payoutAccount.paystackRecipientCode || undefined,
          idempotencyKey,
        },
      ],
      { session },
    );

    await RestaurantBalance.updateOne(
      { restaurant: restaurant._id },
      {
        $inc: {
          availableBalance: -requestedAmount,
          reservedBalance: requestedAmount,
        },
      },
      { session },
    );

    await session.commitTransaction();

    await sendAdminEventNotification({
      title: "New restaurant payout request",
      description: `${scope.userName} requested ${requestedAmount.toFixed(2)} ${policy.currency} payout for ${restaurant.name}.`,
      href: "/admin/restaurant-payouts",
      meta: "Review required",
      createdAt: new Date().toISOString(),
    });

    updateTag("restaurantFinance");
    revalidatePath("/restaurant-admin/finance");
    revalidatePath("/admin/restaurant-payouts");

    return {
      success: true,
      message: "Payout request submitted",
      data: JSON.parse(JSON.stringify(payout[0])),
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    return { success: false, message: formatError(error) };
  } finally {
    session.endSession();
  }
}

async function markRestaurantPayoutPaid(payoutId: string) {
  const connection = await connectToDatabase();
  const session = await connection.startSession();

  try {
    let alreadyPaid = false;

    await session.withTransaction(async () => {
      const payout = await RestaurantPayout.findById(payoutId).session(session);
      if (!payout) throw new Error("Payout not found");
      if (payout.status === "paid") {
        alreadyPaid = true;
        return;
      }
      if (payout.status !== "processing" && payout.status !== "pending") {
        throw new Error(`Cannot mark payout from status ${payout.status}`);
      }

      payout.status = "paid";
      payout.paidAt = new Date();
      await payout.save({ session });

      await ensureRestaurantBalance(payout.restaurant.toString(), session);

      await RestaurantBalance.updateOne(
        { restaurant: payout.restaurant },
        {
          $inc: {
            reservedBalance: -payout.amount,
            lifetimePaid: payout.amount,
          },
        },
        { session },
      );

      await RestaurantLedgerEntry.create(
        [
          {
            restaurant: payout.restaurant,
            payout: payout._id,
            type: "payout_debit",
            amount: -Math.abs(payout.amount),
            currency: payout.currency,
            source: "payout",
            reference: payout.paystackReference || `payout:${payout._id.toString()}`,
            notes: "Restaurant payout completed",
          },
        ],
        { session },
      );
    });

    return {
      success: true,
      message: alreadyPaid ? "Payout already marked as paid" : "Payout marked as paid",
    };
  } catch (error) {
    const isDup =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000;

    if (isDup) {
      return { success: true, message: "Payout already marked as paid" };
    }

    return { success: false, message: formatError(error) };
  } finally {
    session.endSession();
  }
}

async function refundReservedPayoutBalance({
  payoutId,
  status,
  reason,
  processedBy,
}: {
  payoutId: string;
  status: "rejected" | "failed";
  reason?: string;
  processedBy?: string;
}) {
  const connection = await connectToDatabase();
  const session = await connection.startSession();

  try {
    await session.withTransaction(async () => {
      const payout = await RestaurantPayout.findById(payoutId).session(session);
      if (!payout) throw new Error("Payout not found");

      if (["rejected", "failed", "paid"].includes(payout.status)) {
        return;
      }

      payout.status = status;
      payout.failureReason = reason;
      if (processedBy && mongoose.Types.ObjectId.isValid(processedBy)) {
        payout.processedBy = new mongoose.Types.ObjectId(processedBy);
      }
      await payout.save({ session });

      await ensureRestaurantBalance(payout.restaurant.toString(), session);

      await RestaurantBalance.updateOne(
        { restaurant: payout.restaurant },
        {
          $inc: {
            reservedBalance: -payout.amount,
            availableBalance: payout.amount,
          },
        },
        { session },
      );

      await RestaurantLedgerEntry.create(
        [
          {
            restaurant: payout.restaurant,
            payout: payout._id,
            type: "payout_refund",
            amount: Math.abs(payout.amount),
            currency: payout.currency,
            source: "system",
            reference:
              payout.paystackReference || `payout:${payout._id.toString()}:refund`,
            notes: reason || "Payout reverted to available balance",
          },
        ],
        { session },
      );
    });

    return { success: true, message: "Payout funds refunded" };
  } catch (error) {
    const isDup =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000;

    if (isDup) {
      return { success: true, message: "Payout already refunded" };
    }

    return { success: false, message: formatError(error) };
  } finally {
    session.endSession();
  }
}

export async function processRestaurantPayoutByAdmin(input: unknown) {
  try {
    await connectToDatabase();
    const adminSession = await getServerSession();
    if (!isAdminRole(adminSession?.user?.role)) throw new Error("Unauthorized");

    const parsed = adminPayoutDecisionSchema.parse(input);

    const payout = await RestaurantPayout.findById(parsed.payoutId);
    if (!payout) throw new Error("Payout request not found");

    if (parsed.decision === "reject") {
      const result = await refundReservedPayoutBalance({
        payoutId: payout._id.toString(),
        status: "rejected",
        reason: parsed.adminNote || "Rejected by admin",
        processedBy: adminSession.user.id,
      });

      if (!result.success) throw new Error(result.message);

      updateTag("restaurantFinance");
      revalidatePath("/admin/restaurant-payouts");
      revalidatePath("/restaurant-admin/finance");

      return { success: true, message: "Payout rejected and refunded" };
    }

    if (payout.status === "paid") {
      return { success: true, message: "Payout already paid" };
    }

    if (payout.status === "processing" && payout.paystackTransferCode) {
      return {
        success: true,
        message: "Payout is already processing with Paystack",
      };
    }

    const method = normalizePayoutMethod(payout.payoutMethod);
    const canUsePaystack = Boolean(payout.paystackRecipientCode && isPaystackAutoMethod(method));

    payout.status = "processing";
    payout.processedBy = new mongoose.Types.ObjectId(adminSession.user.id);
    payout.adminNote = parsed.adminNote;
    await payout.save();

    try {
      if (canUsePaystack) {
        const transferReference =
          payout.paystackReference || `restaurant-payout-${payout._id.toString()}`;

        if (method === "mpesa_paybill" && !payout.accountReference) {
          throw new Error("Missing paybill account reference for Paystack transfer");
        }

        const transfer = await initiatePaystackTransfer({
          amount: Math.round(Number(payout.amount) * 100),
          recipient: payout.paystackRecipientCode!,
          reason: `Restaurant payout ${payout._id.toString().slice(-8).toUpperCase()}`,
          reference: transferReference,
          accountReference:
            method === "mpesa_paybill" || method === "mpesa_till"
              ? payout.accountReference
              : undefined,
        });

        payout.paystackTransferCode = transfer.transfer_code;
        payout.paystackReference = transfer.reference;
        await payout.save();

        if ((transfer.status || "").toLowerCase() === "success") {
          const paid = await markRestaurantPayoutPaid(payout._id.toString());
          if (!paid.success) throw new Error(paid.message);
        }
      } else {
        const manualReference = String(parsed.paymentReference || "").trim();
        if (!manualReference) {
          throw new Error(
            "Payment reference is required for manual disbursements",
          );
        }
        payout.paystackReference = manualReference;
        await payout.save();

        const paid = await markRestaurantPayoutPaid(payout._id.toString());
        if (!paid.success) throw new Error(paid.message);
      }
    } catch (transferError) {
      const reverted = await refundReservedPayoutBalance({
        payoutId: payout._id.toString(),
        status: "failed",
        reason: formatError(transferError),
        processedBy: adminSession.user.id,
      });

      if (!reverted.success) throw new Error(reverted.message);

      throw transferError;
    }

    updateTag("restaurantFinance");
    revalidatePath("/admin/restaurant-payouts");
    revalidatePath("/restaurant-admin/finance");

    return {
      success: true,
      message: canUsePaystack
        ? "Payout sent to Paystack. Final state will be confirmed by webhook or immediate API response."
        : "Manual payout marked as paid successfully.",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function handlePaystackTransferWebhook(data: any) {
  try {
    await connectToDatabase();

    const transferCode = data?.transfer_code || data?.transferCode;
    const reference = data?.reference;

    if (!transferCode && !reference) {
      return { success: false, message: "Missing transfer identifiers" };
    }

    const payout = await RestaurantPayout.findOne({
      $or: [
        ...(transferCode ? [{ paystackTransferCode: transferCode }] : []),
        ...(reference ? [{ paystackReference: reference }] : []),
      ],
    });

    if (!payout) {
      return { success: true, message: "No matching restaurant payout" };
    }

    const normalizedStatus = String(data?.status || "").toLowerCase();

    if (normalizedStatus === "success") {
      return markRestaurantPayoutPaid(payout._id.toString());
    }

    if (normalizedStatus === "failed" || normalizedStatus === "reversed") {
      return refundReservedPayoutBalance({
        payoutId: payout._id.toString(),
        status: "failed",
        reason: `Paystack transfer ${normalizedStatus}`,
      });
    }

    return { success: true, message: `Ignored transfer status: ${normalizedStatus}` };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getRestaurantFinanceDashboardData(input?: {
  restaurantId?: string;
}) {
  try {
    await connectToDatabase();
    const scope = await getStaffScope();
    const requestedRestaurantId = normalizeId(input?.restaurantId);

    let targetRestaurantId: string;
    if (scope.role === "RESTAURANT") {
      targetRestaurantId = scope.restaurantId;
    } else if (scope.role === "ADMIN") {
      if (!requestedRestaurantId) {
        throw new Error("Select a restaurant to view finance.");
      }
      targetRestaurantId = requestedRestaurantId;
    } else {
      throw new Error("Unauthorized");
    }

    await releaseMaturedPendingRestaurantBalance(targetRestaurantId);

    const restaurantObjectId = new mongoose.Types.ObjectId(targetRestaurantId);

    const [restaurant, balance, payoutAccount, payouts, recentLedger] = await Promise.all([
      Restaurant.findById(targetRestaurantId).select("name email").lean(),
      ensureRestaurantBalance(targetRestaurantId),
      RestaurantPayoutAccount.findOne({ restaurant: restaurantObjectId }).lean(),
      RestaurantPayout.find({ restaurant: restaurantObjectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      RestaurantLedgerEntry.find({ restaurant: restaurantObjectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return {
      success: true,
      data: {
        restaurant: restaurant
          ? {
              _id: restaurant._id.toString(),
              name: restaurant.name,
              email: restaurant.email,
            }
          : null,
        balance: JSON.parse(JSON.stringify(balance)),
        payoutAccount: payoutAccount
          ? {
              ...JSON.parse(JSON.stringify(payoutAccount)),
              payoutMethod: normalizePayoutMethod(payoutAccount.payoutMethod),
              payoutMethodLabel: payoutMethodLabel(payoutAccount.payoutMethod),
              paystackRecipientCode: payoutAccount.paystackRecipientCode
                ? `${payoutAccount.paystackRecipientCode.slice(0, 8)}...`
                : "",
            }
          : null,
        payouts: payouts.map((payout) => ({
          ...JSON.parse(JSON.stringify(payout)),
          payoutMethod: normalizePayoutMethod(payout.payoutMethod),
          payoutMethodLabel: payoutMethodLabel(payout.payoutMethod),
        })),
        recentLedger: JSON.parse(JSON.stringify(recentLedger)),
        policy: getRestaurantSettlementPolicy(),
        viewerRole: scope.role,
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getAdminRestaurantPayouts({
  page = 1,
  limit = 20,
  status,
}: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");

    const dueRestaurantIds = await RestaurantLedgerEntry.distinct("restaurant", {
      type: "order_capture",
      settlementState: "pending",
      availableOn: { $lte: new Date() },
    });
    for (const restaurantId of dueRestaurantIds) {
      await releaseMaturedPendingRestaurantBalance(String(restaurantId));
    }

    const filter: Record<string, unknown> = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const skip = (Math.max(1, Number(page)) - 1) * limit;

    const [payouts, totalPayouts, balanceStats] = await Promise.all([
      RestaurantPayout.find(filter)
        .populate("restaurant", "name slug")
        .populate("requestedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RestaurantPayout.countDocuments(filter),
      RestaurantBalance.aggregate([
        {
          $group: {
            _id: null,
            totalPending: { $sum: "$pendingBalance" },
            totalAvailable: { $sum: "$availableBalance" },
            totalReserved: { $sum: "$reservedBalance" },
            totalPaid: { $sum: "$lifetimePaid" },
            totalCommission: { $sum: "$lifetimeCommission" },
            totalNet: { $sum: "$lifetimeNet" },
          },
        },
      ]),
    ]);

    return {
      success: true,
      data: {
        payouts: payouts.map((payout) => ({
          ...JSON.parse(JSON.stringify(payout)),
          payoutMethod: normalizePayoutMethod(payout.payoutMethod),
          payoutMethodLabel: payoutMethodLabel(payout.payoutMethod),
        })),
        totalPayouts,
        totalPages: Math.max(1, Math.ceil(totalPayouts / limit)),
        balances: balanceStats[0] || {
          totalPending: 0,
          totalAvailable: 0,
          totalReserved: 0,
          totalPaid: 0,
          totalCommission: 0,
          totalNet: 0,
        },
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
