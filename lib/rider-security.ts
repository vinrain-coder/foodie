import { createHash } from "crypto";

export type RiderRiskLevel = "low" | "medium" | "high";

export type RiderDeviceRiskInput = {
  sharedRiderCount: number;
  knownDeviceCount: number;
  riderKycVerified: boolean;
  recentOtpRetries?: number;
};

export type RiderDeviceRiskResult = {
  score: number;
  level: RiderRiskLevel;
  flags: string[];
};

export type HandoffRiskInput = {
  riderRiskScore: number;
  orderTotal: number;
  manualAssignment: boolean;
};

export type HandoffRiskResult = {
  score: number;
  level: RiderRiskLevel;
  signals: string[];
  otpRequired: boolean;
  otpReason: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const hashSecuritySignal = (value?: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  const secret = process.env.AUTH_SECRET || "rider-security";
  return createHash("sha256").update(`${normalized}:${secret}`).digest("hex");
};

export const classifyRiskLevel = (score: number): RiderRiskLevel => {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
};

export const evaluateRiderDeviceRisk = (
  input: RiderDeviceRiskInput,
): RiderDeviceRiskResult => {
  const flags: string[] = [];
  let score = 0;

  if (!input.riderKycVerified) {
    score += 30;
    flags.push("kyc_not_verified");
  }
  if (input.sharedRiderCount >= 2) {
    score += 45;
    flags.push("shared_device_multi_account");
  }
  if (input.sharedRiderCount >= 3) {
    score += 20;
    flags.push("shared_device_high_density");
  }
  if (input.knownDeviceCount >= 4) {
    score += 15;
    flags.push("excessive_device_churn");
  }
  if ((input.recentOtpRetries || 0) > 0) {
    score += 10;
    flags.push("otp_retry_history");
  }

  const finalScore = clamp(score, 0, 100);
  return {
    score: finalScore,
    level: classifyRiskLevel(finalScore),
    flags,
  };
};

export const evaluateHandoffRisk = (
  input: HandoffRiskInput,
): HandoffRiskResult => {
  const signals: string[] = [];
  let score = clamp(Number(input.riderRiskScore || 0), 0, 100);

  if (input.orderTotal >= 5000) {
    score += 25;
    signals.push("high_order_value");
  }
  if (input.orderTotal >= 10000) {
    score += 15;
    signals.push("very_high_order_value");
  }
  if (input.manualAssignment) {
    score += 20;
    signals.push("manual_dispatch_override");
  }

  const finalScore = clamp(score, 0, 100);
  const level = classifyRiskLevel(finalScore);
  const otpRequired = level !== "low";
  return {
    score: finalScore,
    level,
    signals,
    otpRequired,
    otpReason: otpRequired
      ? `Risk level ${level} (${finalScore}) requires OTP handoff`
      : "Low risk handoff",
  };
};

export const hasCompleteRiderCompliance = (profile: {
  isKycVerified?: boolean;
  identityVerification?: { status?: string; documentUrl?: string; selfieUrl?: string };
  vehicleDocuments?: {
    status?: string;
    licenseUrl?: string;
    insuranceUrl?: string;
    vehiclePhotoUrl?: string;
  };
  licenseNumber?: string;
  nationalIdNumber?: string;
}) => {
  const identityReady =
    profile.identityVerification?.status === "verified" &&
    Boolean(profile.identityVerification?.documentUrl) &&
    Boolean(profile.identityVerification?.selfieUrl) &&
    Boolean(profile.nationalIdNumber);

  const vehicleReady =
    profile.vehicleDocuments?.status === "verified" &&
    Boolean(profile.vehicleDocuments?.licenseUrl) &&
    Boolean(profile.vehicleDocuments?.vehiclePhotoUrl) &&
    Boolean(profile.licenseNumber);

  return Boolean(profile.isKycVerified && identityReady && vehicleReady);
};
