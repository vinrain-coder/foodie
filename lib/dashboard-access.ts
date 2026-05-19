import type { UserRole } from "@/lib/constants";

export const RESTAURANT_BLOCKED_ADMIN_PATH_PREFIXES = [
  "/admin/users",
  "/admin/coupons",
  "/admin/affiliates",
  "/admin/payouts",
  "/admin/coins",
  "/admin/wallet",
  "/admin/web-pages",
  "/admin/blogs",
  "/admin/newsletters",
] as const;

export function isAdminRole(role?: string | null): role is "ADMIN" {
  return role === "ADMIN";
}

export function isRestaurantRole(role?: string | null): role is "RESTAURANT" {
  return role === "RESTAURANT";
}

export function canAccessAdminDashboard(
  role?: string | null,
): role is Extract<UserRole, "ADMIN" | "RESTAURANT"> {
  return isAdminRole(role) || isRestaurantRole(role);
}
