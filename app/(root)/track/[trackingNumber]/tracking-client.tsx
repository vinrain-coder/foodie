"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { OrderTrackingStatus } from "@/lib/order-tracking";
import { OrderStatusBadge } from "@/components/shared/order/order-status-badge";
import OrderTimeline from "@/components/shared/order/order-timeline";
import Price from "@/components/shared/menuItem/price";

type TrackingPayload = {
  _id: string;
  trackingNumber: string;
  status: OrderTrackingStatus;
  expectedDeliveryDate?: Date;
  shipment?: {
    courierName?: string;
    courierTrackingReference?: string;
    estimatedDeliveryDate?: Date;
  };
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    country: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  couponDiscount: number;
  totalPrice: number;
  trackingHistory: Array<{
    status: OrderTrackingStatus;
    message: string;
    location?: string;
    createdAt: Date;
  }>;
};

export default function TrackingClient({
  trackingNumber,
}: {
  trackingNumber: string;
}) {
  const [data, setData] = useState<TrackingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<
    "connecting" | "live" | "fallback"
  >("connecting");
  const streamLiveRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let eventSource: EventSource | null = null;
    const fetchTracking = async () => {
      const response = await fetch(
        `/api/tracking/${encodeURIComponent(trackingNumber)}`,
        {
          cache: "no-store",
        },
      );
      const payload = await response.json();
      if (!mounted) return;

      if (!response.ok) {
        setError(payload?.message || "Unable to fetch tracking details.");
        return;
      }

      setError(null);
      setData(payload.data);
    };

    fetchTracking().catch(() => {
      // no-op: handled in fetchTracking
    });

    try {
      eventSource = new EventSource(
        `/api/tracking/${encodeURIComponent(trackingNumber)}/stream`,
      );

      eventSource.addEventListener("tracking.update", (event) => {
        if (!mounted) return;
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          setData(payload);
          setError(null);
          streamLiveRef.current = true;
          setStreamState("live");
        } catch {
          // no-op
        }
      });

      eventSource.addEventListener("tracking.error", (event) => {
        if (!mounted) return;
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          setError(payload?.message || "Tracking stream error.");
        } catch {
          setError("Tracking stream error.");
        }
      });

      eventSource.onerror = () => {
        if (!mounted) return;
        streamLiveRef.current = false;
        setStreamState("fallback");
      };
    } catch {
      streamLiveRef.current = false;
      setStreamState("fallback");
    }

    const intervalId = setInterval(() => {
      if (!streamLiveRef.current) {
        void fetchTracking();
      }
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [trackingNumber]);

  const timeline = useMemo(
    () =>
      [...(data?.trackingHistory || [])].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [data],
  );

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-red-600">{error}</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">Loading tracking details…</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Tracking #{data.trackingNumber}</p>
              <OrderStatusBadge status={data.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Arrives in about 30 mins (ETA{" "}
              {
                formatDateTime(
                  new Date(
                    data.shipment?.estimatedDeliveryDate ||
                      data.expectedDeliveryDate ||
                      new Date(),
                  ),
                ).timeOnly
              }
              )
            </p>
            <p className="text-xs text-muted-foreground">
              Live tracking: {streamState === "live" ? "connected" : "reconnecting"}
            </p>
            <p className="text-sm">
              Courier: {data.shipment?.courierName || "Pending assignment"}
              {data.shipment?.courierTrackingReference
                ? ` • Ref: ${data.shipment.courierTrackingReference}`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Order timeline</h2>
            <OrderTimeline events={timeline} />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Order summary</h2>
            {data.items.map((item, index) => (
              <p key={`${item.name}-${index}`} className="text-sm">
                {item.name} × {item.quantity}
              </p>
            ))}
            <div className="pt-2 text-sm space-y-1">
              <p>
                Items: <Price price={data.itemsPrice} plain />
              </p>
              <p>
                Shipping: <Price price={data.shippingPrice} plain />
              </p>
              <p>
                Tax: <Price price={data.taxPrice} plain />
              </p>
              {data.couponDiscount > 0 ? (
                <p>
                  Discount: <Price price={data.couponDiscount} plain />
                </p>
              ) : (
                <p className="text-muted-foreground">No discount applied</p>
              )}
              <p className="font-semibold">
                Total: <Price price={data.totalPrice} plain />
              </p>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Deliver to {data.shippingAddress.fullName},{" "}
              {data.shippingAddress.street}, {data.shippingAddress.city},{" "}
              {data.shippingAddress.country}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
