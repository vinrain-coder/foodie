import type { Metadata } from "next";
import { redirect } from "next/navigation";

import Breadcrumb from "@/components/shared/breadcrumb";
import { getServerSession } from "@/lib/get-session";
import { getSetting } from "@/lib/actions/setting.actions";
import { getAffiliateStatus } from "@/lib/actions/affiliate.actions";
import AffiliateClientLayout from "./affiliate-client";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Affiliate Program",
    description:
      "Join our affiliate program and earn commissions by promoting premium footwear products.",
    openGraph: {
      title: "Affiliate Program",
      description:
        "Earn commissions by referring customers to premium footwear products.",
      type: "website",
    },
  };
}

export default async function AffiliatePage() {
  const { affiliate: settings } = await getSetting();
  const session = await getServerSession();

  const affiliateStatus = session
    ? await getAffiliateStatus()
    : { exists: false };

  // If user is an affiliate, redirect to dashboard
  if (session && affiliateStatus.exists) {
    return redirect("/affiliate/dashboard");
  }

  const commissionRate = settings?.commissionRate || 10;
  const minimumPayout = settings.minWithdrawalAmount || 1000;

  return (
    <div className="min-h-screen bg-background">
      <Breadcrumb />
      <AffiliateClientLayout
        commissionRate={commissionRate}
        minimumPayout={minimumPayout}
        affiliateStatus={affiliateStatus}
        user={session?.user || null}
      />
    </div>
  );
}