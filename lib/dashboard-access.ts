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

const ROLE_TOKEN_SPLIT_REGEX = /[\s,;|:+_-]+/;

export function parseRoleTokens(role?: string | null): string[] {
  if (!role) return [];
  const normalized = role.trim().toUpperCase();
  if (!normalized) return [];
  return normalized.split(ROLE_TOKEN_SPLIT_REGEX).filter(Boolean);
}

export function normalizeUserRole(role?: string | null): string | undefined {
  const tokens = parseRoleTokens(role);
  if (tokens.includes("ADMIN")) return "ADMIN";
  if (tokens.includes("RESTAURANT")) return "RESTAURANT";
  if (tokens.includes("RIDER")) return "RIDER";
  if (tokens.includes("USER")) return "USER";
  return tokens[0];
}

export function isAdminRole(role?: string | null): role is "ADMIN" {
  return parseRoleTokens(role).includes("ADMIN");
}

export function isRestaurantRole(role?: string | null): role is "RESTAURANT" {
  return parseRoleTokens(role).includes("RESTAURANT");
}

export function canAccessAdminDashboard(
  role?: string | null,
): role is Extract<UserRole, "ADMIN" | "RESTAURANT"> {
  return isAdminRole(role) || isRestaurantRole(role);
}

export function canAccessRestaurantDashboard(
  role?: string | null,
): role is Extract<UserRole, "ADMIN" | "RESTAURANT"> {
  return isRestaurantRole(role) || isAdminRole(role);
}
