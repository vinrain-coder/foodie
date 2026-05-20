"use client";

import { FOOD_DELIVERY_ETA_MINUTES } from "@/lib/utils";
import Price from "@/components/shared/menuItem/price";

export default function DeliveryEstimator({
  deliveryFee,
}: {
  deliveryFee?: number;
}) {
  const effectiveDeliveryFee = Number(deliveryFee || 0);

  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">Delivery Estimator</p>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          Kenya Wide
        </span>
      </div>

      <div className="mt-2 rounded-md border border-border/60 bg-background/70 px-3 py-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          ETA
        </p>
        <p className="text-sm font-semibold text-green-700">
          Arrives in about {FOOD_DELIVERY_ETA_MINUTES} mins
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-muted-foreground/10 pt-2">
        <div className="text-xs font-medium">Delivery fee:</div>
        <div className="text-sm font-bold text-green-700">
          {effectiveDeliveryFee === 0 ? "FREE" : <Price price={effectiveDeliveryFee} plain />}
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-tight text-muted-foreground/70">
        * Final delivery fee is set by the restaurant.
      </p>
    </div>
  );
}
