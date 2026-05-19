import { SubscriptionTier, UserRole } from "../constants";

export interface UserSession {
  role: UserRole | string;
  subscription?: SubscriptionTier;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: Date;
  _id?: string;
  id?: string;
  email?: string;
}

export function isPremiumOrAdmin(user: UserSession | null): boolean {
  return !!user && (user.subscription === "PREMIUM" || user.role === "ADMIN");
}

export function isLoggedIn(user: UserSession | null): boolean {
  return !!user;
}

/**
 * Determines if a user can view a coupon's details (code, discount, etc.)
 * - Free coupons: visible to everyone (including unauthenticated)
 * - Premium coupons: visible only to premium members or admins
 *   (non-premium logged-in users and unauthenticated users see a locked preview)
 */
export function canViewCoupon(
  user: UserSession | null,
  coupon: { tier: string }
) {
  if (coupon.tier === "premium") {
    return isPremiumOrAdmin(user);
  }
  return true;
}

/**
 * Determines if a user can use (apply) a coupon at checkout.
 * - Free coupons: anyone can use, but must be logged in
 * - Premium coupons: only premium members or admins
 */
export function canUseCoupon(
  user: UserSession | null,
  coupon: { tier: string }
) {
  // Premium coupons require premium status
  if (coupon.tier === "premium" && !isPremiumOrAdmin(user)) {
    return { allowed: false, reason: "This coupon is for premium members only." };
  }

  // All coupons require the user to be logged in to actually use them
  if (!user) {
    return { allowed: false, reason: "You must be logged in to use coupons." };
  }

  return { allowed: true };
}

/**
 * Returns the display mode for a coupon card:
 * - "full"    : show all details (code, discount, copy button)
 * - "locked"  : show blurred preview with lock overlay (premium user viewing premium coupon)
 * - "preview" : show basic info but code is hidden (unauthed or free user viewing premium)
 */
export function getCouponDisplayMode(
  user: UserSession | null,
  coupon: { tier: string }
): "full" | "locked" | "preview" {
  if (coupon.tier === "premium") {
    if (isPremiumOrAdmin(user)) return "full";
    if (isLoggedIn(user)) return "locked";
    return "preview";
  }
  // Free coupons: full details for logged-in users, preview for unauthed
  if (isLoggedIn(user)) return "full";
  return "preview";
}

export function getUserCouponLimit(user: UserSession | null) {
  if (!user) return 0;

  const isPremium = isPremiumOrAdmin(user);

  // Free users: 5 coupons per month (example)
  // Premium users: Unlimited
  return isPremium ? Infinity : 5;
}
