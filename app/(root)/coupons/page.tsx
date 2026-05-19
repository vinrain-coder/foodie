import type { Metadata } from "next";

import Breadcrumb from "@/components/shared/breadcrumb";
import { getServerSession } from "@/lib/get-session";
import { getSetting } from "@/lib/actions/setting.actions";
import { getAllCoupons } from "@/lib/actions/coupon.actions";
import type { CouponCardProps } from "@/components/coupons/coupon-card";

import {
  isPremiumOrAdmin,
  isLoggedIn,
  UserSession,
} from "@/lib/coupons/access-control";
import CouponsClientLayout from "./coupons-client";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Coupons & Deals",
    description:
      "Exclusive discount coupons and offers to save on your purchases.",
    openGraph: {
      title: "Coupons & Deals",
      description:
        "Unlock exclusive deals and savings with our coupons platform.",
      type: "website",
    },
  };
}

export default async function CouponsPage() {
  const session = await getServerSession();

  const user = session?.user as UserSession | null;

  const filterTiers = !isLoggedIn(user) ? ["free"] : undefined;

  const [{ coupons }, settings] = await Promise.all([
    getAllCoupons({
      limit: 100,
      tiers: filterTiers,
    }),
    getSetting(),
  ]);

  const premiumMembershipPrice = settings.common.premiumMembershipPrice || 500;

  const isPremium = isPremiumOrAdmin(user);

  const serializedCoupons = coupons.map((c) => ({
    _id: c._id.toString(),
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    tier: c.tier,
    isPublished: c.isPublished,
    minPurchase: c.minPurchase,
    maxUsage: c.maxUsage,
    usageCount: c.usageCount,
    expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString() : null,
    createdAt: c.createdAt
      ? new Date(c.createdAt).toISOString()
      : new Date().toISOString(),
  })) as CouponCardProps[];

  return (
    <div className="min-h-screen bg-background">
      <Breadcrumb />

      <CouponsClientLayout
        user={user}
        coupons={serializedCoupons}
        isPremium={isPremium}
        premiumMembershipPrice={premiumMembershipPrice}
      />
    </div>
  );
}
