"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";

function CouponTrackerContent({ cookieExpiryDays = 1 }: { cookieExpiryDays?: number }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const couponCode = searchParams.get("coupon");

    if (couponCode) {
      // Store the coupon code in a cookie for auto-apply at checkout
      Cookies.set("coupon_code", couponCode, {
        expires: cookieExpiryDays,
        path: "/",
        sameSite: "lax",
      });
    }
  }, [searchParams, cookieExpiryDays]);

  return null;
}

export default function CouponTracker({ cookieExpiryDays = 1 }: { cookieExpiryDays?: number }) {
  return (
    <Suspense fallback={null}>
      <CouponTrackerContent cookieExpiryDays={cookieExpiryDays} />
    </Suspense>
  );
}
