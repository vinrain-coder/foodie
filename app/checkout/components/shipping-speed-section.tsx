"use client";

import {
  calculateFutureMinutes,
  FOOD_DELIVERY_ETA_MINUTES,
  formatDateTime,
} from "@/lib/utils";
import Price from "@/components/shared/menuItem/price";

interface ShippingSpeedSectionProps {
  shippingPrice?: number;
}

export const ShippingSpeedSection = ({ shippingPrice }: ShippingSpeedSectionProps) => {
  const effectiveShippingPrice = Number(shippingPrice || 0);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 font-bold">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        Delivery ETA
      </p>
      <p className="mt-1 text-lg text-green-700">
        Arrives in about {FOOD_DELIVERY_ETA_MINUTES} mins
      </p>
      <p className="text-xs font-normal text-muted-foreground">
        Target time{" "}
        {
          formatDateTime(calculateFutureMinutes(FOOD_DELIVERY_ETA_MINUTES))
            .timeOnly
        }
      </p>

      <div className="mt-4 border-t border-border/60 pt-3 text-sm font-normal">
        <p className="mb-1">Shipping charge (restaurant delivery fee)</p>
        <p className="font-semibold">
          {effectiveShippingPrice === 0 ? (
            "FREE Delivery"
          ) : (
            <Price price={effectiveShippingPrice} plain />
          )}
        </p>
      </div>
    </div>
  );
};
