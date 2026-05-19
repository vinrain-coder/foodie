export const SENDER_NAME = process.env.SENDER_NAME || "support";
export const SENDER_EMAIL = process.env.SENDER_EMAIL || "onboarding@resend.dev";

export const USER_ROLES = ["ADMIN", "USER", "RESTAURANT", "RIDER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUBSCRIPTION_TIERS = ["FREE", "PREMIUM"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];
export const THEMES = ["Light", "Dark", "System"];
