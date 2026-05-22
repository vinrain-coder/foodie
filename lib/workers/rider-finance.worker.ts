import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import DeliveryJob from "@/lib/db/models/delivery-job.model";
import Order from "@/lib/db/models/order.model";
import RiderBalance from "@/lib/db/models/rider-balance.model";
import RiderEarningLedger from "@/lib/db/models/rider-earning-ledger.model";
import RiderPayout from "@/lib/db/models/rider-payout.model";
import RiderPayoutReconciliation from "@/lib/db/models/rider-payout-reconciliation.model";
import {
  assessRiderFraudHold,
  getNextScheduledPayoutDate,
  getRiderPayoutPolicy,
} from "@/lib/rider-finance";
import { round2 } from "@/lib/utils";

const asDayKey = (date: Date) => date.toISOString().slice(0, 10);

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: number }).code === 11000;

const normalizeObjectId = (value: unknown) => {
  const text = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(text)) return null;
  return new mongoose.Types.ObjectId(text);
};

export async function ensureRiderBalance(
  riderId: string,
  session?: mongoose.ClientSession,
) {
  const riderObjectId = normalizeObjectId(riderId);
  if (!riderObjectId) {
    throw new Error("Invalid rider id");
  }

  const existing = await RiderBalance.findOne({ rider: riderObjectId }).session(
    session || null,
  );
  if (existing) return existing;

  const created = await RiderBalance.create(
    [{ rider: riderObjectId }],
    session ? { session } : undefined,
  );

  return created[0];
}

export async function recordRiderCompletedJobEarning(params: {
  riderId: string;
  deliveryJobId: string;
  trackingNumber: string;
  amount: number;
  acceptedAt?: Date | null;
  deliveredAt: Date;
  otpAttempts?: number;
  geotagAccuracyM?: number;
}) {
  const riderObjectId = normalizeObjectId(params.riderId);
  const deliveryJobObjectId = normalizeObjectId(params.deliveryJobId);
  if (!riderObjectId || !deliveryJobObjectId) {
    throw new Error("Invalid rider or delivery job id");
  }

  const policy = getRiderPayoutPolicy();
  const safeAmount = round2(Math.max(0, Number(params.amount || 0)));
  if (safeAmount <= 0) {
    return {
      created: false,
      amount: 0,
      availableOn: null,
      holdReasons: [],
      message: "No earnings to record",
    };
  }

  const immutableKey = `earning:${deliveryJobObjectId.toString()}:base_fare`;
  const existing = await RiderEarningLedger.findOne({
    immutableKey,
  })
    .select("_id")
    .lean();
  if (existing?._id) {
    return {
      created: false,
      amount: safeAmount,
      availableOn: null,
      holdReasons: [],
      message: "Earning already recorded",
    };
  }

  const fraudAssessment = assessRiderFraudHold({
    policy,
    acceptedAt: params.acceptedAt,
    deliveredAt: params.deliveredAt,
    otpAttempts: params.otpAttempts,
    geotagAccuracyM: params.geotagAccuracyM,
  });

  const scheduleHoldDate = getNextScheduledPayoutDate({
    fromDate: params.deliveredAt,
    schedule: policy.payoutSchedule,
    weeklyDay: policy.weeklyPayoutDay,
  });
  const baseHoldDate = new Date(
    params.deliveredAt.getTime() + policy.baseHoldHours * 60 * 60 * 1000,
  );
  const fraudHoldDate = new Date(
    params.deliveredAt.getTime() +
      fraudAssessment.extraHoldHours * 60 * 60 * 1000,
  );
  const availableOn = new Date(
    Math.max(
      scheduleHoldDate.getTime(),
      baseHoldDate.getTime(),
      fraudHoldDate.getTime(),
    ),
  );

  const connection = await connectToDatabase();
  const session = await connection.startSession();

  try {
    let result: {
      created: boolean;
      amount: number;
      availableOn: Date;
      holdReasons: string[];
      message: string;
    } = {
      created: false,
      amount: safeAmount,
      availableOn,
      holdReasons: fraudAssessment.reasons,
      message: "Earning already recorded",
    };

    await session.withTransaction(async () => {
      const duplicate = await RiderEarningLedger.findOne({ immutableKey })
        .session(session)
        .select("_id")
        .lean();
      if (duplicate?._id) return;

      await RiderEarningLedger.create(
        [
          {
            rider: riderObjectId,
            deliveryJob: deliveryJobObjectId,
            type: "base_fare",
            amount: safeAmount,
            currency: policy.currency,
            status: "pending",
            source: "delivery_job",
            availableOn,
            immutableKey,
            reason: `Delivery payout for ${params.trackingNumber}`,
            metadata: {
              component: "base_fare",
              source: "shippingPrice",
              fraudHoldApplied: fraudAssessment.requiresHold,
              fraudHoldReasons: fraudAssessment.reasons,
              payoutSchedule: policy.payoutSchedule,
            },
          },
        ],
        { session },
      );

      await ensureRiderBalance(riderObjectId.toString(), session);
      await RiderBalance.updateOne(
        { rider: riderObjectId },
        {
          $inc: {
            pendingBalance: safeAmount,
            lifetimeEarned: safeAmount,
          },
        },
        { session },
      );

      result = {
        created: true,
        amount: safeAmount,
        availableOn,
        holdReasons: fraudAssessment.reasons,
        message: "Earning recorded",
      };
    });

    return result;
  } finally {
    session.endSession();
  }
}

export async function releaseMaturedPendingRiderEarnings(input?: {
  limit?: number;
}) {
  await connectToDatabase();
  const now = new Date();
  const limit = Math.max(10, Math.min(2000, Math.floor(input?.limit || 400)));

  const candidates = await RiderEarningLedger.find({
    status: "pending",
    amount: { $gt: 0 },
    availableOn: { $lte: now },
    type: { $in: ["base", "base_fare", "distance", "wait_time", "bonus"] },
  })
    .sort({ availableOn: 1, createdAt: 1 })
    .limit(limit)
    .select("_id rider deliveryJob amount currency")
    .lean();

  let releasedEntries = 0;
  let releasedAmount = 0;
  let skipped = 0;

  for (const entry of candidates) {
    if (!entry?._id || !entry?.rider) {
      skipped += 1;
      continue;
    }
    const amount = round2(Math.max(0, Number(entry.amount || 0)));
    if (amount <= 0) {
      skipped += 1;
      continue;
    }

    const entryId = String(entry._id);
    const riderId = String(entry.rider);
    const pendingReleaseKey = `release:pending:${entryId}`;
    const availableReleaseKey = `release:available:${entryId}`;

    const alreadyReleased = await RiderEarningLedger.exists({
      immutableKey: availableReleaseKey,
    });
    if (alreadyReleased) {
      skipped += 1;
      continue;
    }

    const connection = await connectToDatabase();
    const session = await connection.startSession();

    try {
      let moved = false;
      await session.withTransaction(async () => {
        const existsNow = await RiderEarningLedger.exists({
          immutableKey: availableReleaseKey,
        }).session(session);
        if (existsNow) return;

        await RiderEarningLedger.create(
          [
            {
              rider: new mongoose.Types.ObjectId(riderId),
              deliveryJob: entry.deliveryJob,
              type: "adjustment",
              amount: -Math.abs(amount),
              currency: entry.currency || "KES",
              status: "pending",
              source: "system",
              immutableKey: pendingReleaseKey,
              releasedAt: now,
              reason: "Released pending earning to available balance",
              metadata: { releaseOf: entryId },
            },
            {
              rider: new mongoose.Types.ObjectId(riderId),
              deliveryJob: entry.deliveryJob,
              type: "adjustment",
              amount: Math.abs(amount),
              currency: entry.currency || "KES",
              status: "available",
              source: "system",
              immutableKey: availableReleaseKey,
              releasedAt: now,
              reason: "Released pending earning to available balance",
              metadata: { releaseOf: entryId },
            },
          ],
          { session },
        );

        await ensureRiderBalance(riderId, session);
        await RiderBalance.updateOne(
          { rider: new mongoose.Types.ObjectId(riderId) },
          {
            $inc: {
              pendingBalance: -Math.abs(amount),
              availableBalance: Math.abs(amount),
            },
          },
          { session },
        );

        moved = true;
      });

      if (moved) {
        releasedEntries += 1;
        releasedAmount = round2(releasedAmount + amount);
      } else {
        skipped += 1;
      }
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        skipped += 1;
      } else {
        throw error;
      }
    } finally {
      session.endSession();
    }
  }

  return {
    scanned: candidates.length,
    releasedEntries,
    releasedAmount,
    skipped,
  };
}

export async function scheduleRiderPayoutsIfDue(input?: { now?: Date }) {
  await connectToDatabase();
  const now = input?.now || new Date();
  const policy = getRiderPayoutPolicy();

  if (
    policy.payoutSchedule === "weekly" &&
    now.getDay() !== policy.weeklyPayoutDay
  ) {
    return {
      due: false,
      reason: "Not scheduled payout day",
      payoutsCreated: 0,
      reservedAmount: 0,
    };
  }

  const eligible = await RiderBalance.find({
    availableBalance: { $gte: policy.minimumPayoutAmount },
  })
    .select("rider availableBalance")
    .lean();

  let payoutsCreated = 0;
  let reservedAmount = 0;
  const dayKey = asDayKey(now);

  for (const balance of eligible) {
    const riderId = String(balance.rider);
    const payoutAmount = round2(Math.max(0, Number(balance.availableBalance || 0)));
    if (payoutAmount < policy.minimumPayoutAmount) continue;

    const idempotencyKey = `rider:auto:${riderId}:${dayKey}:${policy.payoutSchedule}`;
    const exists = await RiderPayout.exists({ idempotencyKey });
    if (exists) continue;

    const connection = await connectToDatabase();
    const session = await connection.startSession();

    try {
      let created = false;
      await session.withTransaction(async () => {
        const already = await RiderPayout.exists({ idempotencyKey }).session(session);
        if (already) return;

        const payoutDocs = await RiderPayout.create(
          [
            {
              rider: new mongoose.Types.ObjectId(riderId),
              amount: payoutAmount,
              currency: policy.currency,
              status: "pending",
              source: "auto",
              scheduledFor: now,
              idempotencyKey,
              metadata: {
                payoutSchedule: policy.payoutSchedule,
                minimumThreshold: policy.minimumPayoutAmount,
              },
            },
          ],
          { session },
        );
        const payout = payoutDocs[0];

        await RiderEarningLedger.create(
          [
            {
              rider: payout.rider,
              type: "adjustment",
              amount: -Math.abs(payoutAmount),
              currency: policy.currency,
              status: "available",
              source: "payout",
              immutableKey: `payout:available:${payout._id.toString()}`,
              reason: "Reserved for payout processing",
              metadata: { payoutId: payout._id.toString() },
            },
            {
              rider: payout.rider,
              type: "adjustment",
              amount: Math.abs(payoutAmount),
              currency: policy.currency,
              status: "held",
              source: "payout",
              immutableKey: `payout:held:${payout._id.toString()}`,
              reason: "Reserved for payout processing",
              metadata: { payoutId: payout._id.toString() },
            },
          ],
          { session },
        );

        await ensureRiderBalance(riderId, session);
        await RiderBalance.updateOne(
          { rider: payout.rider },
          {
            $inc: {
              availableBalance: -Math.abs(payoutAmount),
              reservedBalance: Math.abs(payoutAmount),
            },
          },
          { session },
        );

        created = true;
      });

      if (created) {
        payoutsCreated += 1;
        reservedAmount = round2(reservedAmount + payoutAmount);
      }
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    } finally {
      session.endSession();
    }
  }

  return {
    due: true,
    payoutsCreated,
    reservedAmount,
    eligibleRiders: eligible.length,
  };
}

export async function runNightlyRiderPayoutReconciliation(input?: {
  now?: Date;
}) {
  await connectToDatabase();
  const now = input?.now || new Date();

  const windowEnd = new Date(now);
  windowEnd.setHours(0, 0, 0, 0);
  windowEnd.setMilliseconds(-1);

  const windowStart = new Date(windowEnd);
  windowStart.setHours(0, 0, 0, 0);
  const runDate = asDayKey(windowStart);

  const deliveredJobs = await DeliveryJob.find({
    state: "delivered",
    deliveredAt: { $gte: windowStart, $lte: windowEnd },
    rider: { $exists: true },
  })
    .select("rider order")
    .lean();

  const orderIds = Array.from(
    new Set(deliveredJobs.map((job) => String(job.order)).filter(Boolean)),
  );
  const orders = await Order.find({ _id: { $in: orderIds } })
    .select("_id shippingPrice")
    .lean();
  const orderMap = new Map(
    orders.map((order) => [String(order._id), Number(order.shippingPrice || 0)]),
  );

  const completionMap = new Map<
    string,
    { count: number; earnings: number }
  >();
  for (const job of deliveredJobs) {
    const riderId = String(job.rider || "");
    if (!riderId) continue;
    const orderAmount = round2(Math.max(0, Number(orderMap.get(String(job.order)) || 0)));
    const current = completionMap.get(riderId) || { count: 0, earnings: 0 };
    completionMap.set(riderId, {
      count: current.count + 1,
      earnings: round2(current.earnings + orderAmount),
    });
  }

  const ledgerRows = await RiderEarningLedger.aggregate([
    {
      $match: {
        createdAt: { $gte: windowStart, $lte: windowEnd },
        type: { $in: ["base", "base_fare"] },
      },
    },
    {
      $group: {
        _id: "$rider",
        count: { $sum: 1 },
        total: { $sum: "$amount" },
      },
    },
  ]);
  const ledgerMap = new Map<string, { count: number; total: number }>(
    ledgerRows.map((row) => [
      String(row._id),
      {
        count: Number(row.count || 0),
        total: round2(Number(row.total || 0)),
      },
    ]),
  );

  const payouts = await RiderPayout.aggregate([
    {
      $match: {
        status: "paid",
        paidAt: { $gte: windowStart, $lte: windowEnd },
      },
    },
    {
      $group: {
        _id: "$rider",
        total: { $sum: "$amount" },
      },
    },
  ]);
  const payoutMap = new Map<string, number>(
    payouts.map((row) => [String(row._id), round2(Number(row.total || 0))]),
  );

  const riderIds = new Set<string>([
    ...completionMap.keys(),
    ...ledgerMap.keys(),
    ...payoutMap.keys(),
  ]);

  const mismatches: Array<{
    rider: mongoose.Types.ObjectId;
    completedDeliveriesCount: number;
    ledgerDeliveriesCount: number;
    completedEarningsTotal: number;
    ledgerEarningsTotal: number;
    paidOutTotal: number;
    openLiability: number;
    integrityDelta: number;
    reasons: string[];
  }> = [];

  for (const riderId of riderIds) {
    const riderObjectId = normalizeObjectId(riderId);
    if (!riderObjectId) continue;

    const completed = completionMap.get(riderId) || { count: 0, earnings: 0 };
    const ledger = ledgerMap.get(riderId) || { count: 0, total: 0 };
    const paidOutTotal = payoutMap.get(riderId) || 0;

    const integrityDelta = round2(completed.earnings - ledger.total);
    const openLiability = round2(ledger.total - paidOutTotal);
    const reasons: string[] = [];

    if (completed.count !== ledger.count) reasons.push("delivery_count_mismatch");
    if (Math.abs(integrityDelta) > 0.01) reasons.push("delivery_amount_mismatch");
    if (paidOutTotal - ledger.total > 0.01) reasons.push("payout_exceeds_earnings");

    if (reasons.length > 0) {
      mismatches.push({
        rider: riderObjectId,
        completedDeliveriesCount: completed.count,
        ledgerDeliveriesCount: ledger.count,
        completedEarningsTotal: round2(completed.earnings),
        ledgerEarningsTotal: round2(ledger.total),
        paidOutTotal: round2(paidOutTotal),
        openLiability,
        integrityDelta,
        reasons,
      });
    }
  }

  await RiderPayoutReconciliation.findOneAndUpdate(
    { runDate },
    {
      $set: {
        runDate,
        windowStart,
        windowEnd,
        totalRidersChecked: riderIds.size,
        totalMismatches: mismatches.length,
        mismatches,
        metadata: {
          generatedAt: now.toISOString(),
        },
      },
    },
    { upsert: true, new: true },
  );

  return {
    runDate,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    totalRidersChecked: riderIds.size,
    totalMismatches: mismatches.length,
  };
}

export async function runRiderFinanceOps(input?: {
  releaseLimit?: number;
  reconcile?: boolean;
}) {
  const released = await releaseMaturedPendingRiderEarnings({
    limit: input?.releaseLimit,
  });
  const payouts = await scheduleRiderPayoutsIfDue();
  const reconciliation = input?.reconcile
    ? await runNightlyRiderPayoutReconciliation()
    : null;

  return {
    released,
    payouts,
    reconciliation,
  };
}
