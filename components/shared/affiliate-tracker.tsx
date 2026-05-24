"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import {
  AFFILIATE_TRACKING_COOKIE_KEY,
  LEGACY_AFFILIATE_TRACKING_COOKIE_KEYS,
} from "@/lib/affiliate-tracking";

function AffiliateTrackerContent({ cookieExpiryDays = 30 }: { cookieExpiryDays?: number }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const affiliateCode = searchParams.get("ref") || searchParams.get("aff");

    if (affiliateCode) {
      Cookies.set(AFFILIATE_TRACKING_COOKIE_KEY, affiliateCode, {
        expires: cookieExpiryDays,
        path: "/",
        sameSite: "lax",
      });
      for (const legacyKey of LEGACY_AFFILIATE_TRACKING_COOKIE_KEYS) {
        Cookies.set(legacyKey, affiliateCode, {
          expires: cookieExpiryDays,
          path: "/",
          sameSite: "lax",
        });
      }
    }
  }, [searchParams, cookieExpiryDays]);

  return null;
}

export default function AffiliateTracker({ cookieExpiryDays = 30 }: { cookieExpiryDays?: number }) {
  return (
    <Suspense fallback={null}>
      <AffiliateTrackerContent cookieExpiryDays={cookieExpiryDays} />
    </Suspense>
  );
}
