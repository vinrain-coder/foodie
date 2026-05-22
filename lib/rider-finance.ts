import { round2 } from "./utils";

export type RiderPayoutSchedule = "daily" | "weekly";

export type RiderFraudHoldAssessment = {
  requiresHold: boolean;
  extraHoldHours: number;
  reasons: string[];
};

export type RiderPayoutPolicy = {
  currency: string;
  payoutSchedule: RiderPayoutSchedule;
  weeklyPayoutDay: number;
  minimumPayoutAmount: number;
  baseHoldHours: number;
  fraudHold: {
    enabled: boolean;
    extraHoldHours: number;
    minDeliveryMinutes: number;
    maxDeliveryMinutes: number;
    maxGeotagAccuracyMeters: number;
    maxOtpAttemptsBeforeHold: number;
  };
};

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const getRiderPayoutPolicy = (): RiderPayoutPolicy => {
  const payoutScheduleRaw = String(process.env.RIDER_PAYOUT_SCHEDULE || "weekly")
    .trim()
    .toLowerCase();
  const payoutSchedule: RiderPayoutSchedule =
    payoutScheduleRaw === "daily" ? "daily" : "weekly";

  const weeklyPayoutDay = Math.max(
    0,
    Math.min(6, Math.floor(toNumber(process.env.RIDER_PAYOUT_WEEKLY_DAY, 1))),
  );

  return {
    currency: String(process.env.RIDER_PAYOUT_CURRENCY || "KES")
      .trim()
      .toUpperCase(),
    payoutSchedule,
    weeklyPayoutDay,
    minimumPayoutAmount: Math.max(
      0,
      round2(toNumber(process.env.RIDER_MIN_PAYOUT_THRESHOLD, 250)),
    ),
    baseHoldHours: Math.max(
      0,
      Math.floor(toNumber(process.env.RIDER_BASE_HOLD_HOURS, 12)),
    ),
    fraudHold: {
      enabled:
        String(process.env.RIDER_FRAUD_HOLD_ENABLED || "true")
          .trim()
          .toLowerCase() !== "false",
      extraHoldHours: Math.max(
        0,
        Math.floor(toNumber(process.env.RIDER_FRAUD_EXTRA_HOLD_HOURS, 24)),
      ),
      minDeliveryMinutes: Math.max(
        0,
        toNumber(process.env.RIDER_FRAUD_MIN_DELIVERY_MINUTES, 2),
      ),
      maxDeliveryMinutes: Math.max(
        1,
        toNumber(process.env.RIDER_FRAUD_MAX_DELIVERY_MINUTES, 240),
      ),
      maxGeotagAccuracyMeters: Math.max(
        1,
        toNumber(process.env.RIDER_FRAUD_MAX_GEOTAG_ACCURACY_M, 120),
      ),
      maxOtpAttemptsBeforeHold: Math.max(
        0,
        Math.floor(toNumber(process.env.RIDER_FRAUD_MAX_OTP_ATTEMPTS, 0)),
      ),
    },
  };
};

export const getNextScheduledPayoutDate = ({
  fromDate,
  schedule,
  weeklyDay,
}: {
  fromDate: Date;
  schedule: RiderPayoutSchedule;
  weeklyDay: number;
}) => {
  const base = new Date(fromDate);
  base.setSeconds(0, 0);
  base.setMinutes(0);

  if (schedule === "daily") {
    const next = new Date(base);
    next.setDate(next.getDate() + 1);
    next.setHours(0);
    return next;
  }

  const day = Math.max(0, Math.min(6, weeklyDay));
  const next = new Date(base);
  next.setHours(0);
  const currentDay = next.getDay();
  let diff = day - currentDay;
  if (diff <= 0) diff += 7;
  next.setDate(next.getDate() + diff);
  return next;
};

export const assessRiderFraudHold = ({
  policy,
  acceptedAt,
  deliveredAt,
  otpAttempts,
  geotagAccuracyM,
}: {
  policy: RiderPayoutPolicy;
  acceptedAt?: Date | null;
  deliveredAt: Date;
  otpAttempts?: number;
  geotagAccuracyM?: number;
}): RiderFraudHoldAssessment => {
  if (!policy.fraudHold.enabled) {
    return { requiresHold: false, extraHoldHours: 0, reasons: [] };
  }

  const reasons: string[] = [];
  if (acceptedAt) {
    const deliveryMinutes =
      (deliveredAt.getTime() - acceptedAt.getTime()) / (1000 * 60);
    if (deliveryMinutes < policy.fraudHold.minDeliveryMinutes) {
      reasons.push("delivery_too_fast");
    }
    if (deliveryMinutes > policy.fraudHold.maxDeliveryMinutes) {
      reasons.push("delivery_too_slow");
    }
  }

  if (
    Number.isFinite(geotagAccuracyM) &&
    Number(geotagAccuracyM) > policy.fraudHold.maxGeotagAccuracyMeters
  ) {
    reasons.push("geotag_accuracy_low");
  }

  if ((otpAttempts || 0) > policy.fraudHold.maxOtpAttemptsBeforeHold) {
    reasons.push("otp_retry_detected");
  }

  return {
    requiresHold: reasons.length > 0,
    extraHoldHours: reasons.length > 0 ? policy.fraudHold.extraHoldHours : 0,
    reasons,
  };
};
