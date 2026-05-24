"use client";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "./order-status-badge";
import OrderTimeline from "./order-timeline";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cancelOrder,
  deliverOrder,
  initiateExchange,
  requestReturnOrder,
  SerializedOrder,
  updateOrderStatus,
  updateOrderToPaid,
} from "@/lib/actions/order.actions";
import { cn, formatDateTime, formatNumberWithTwoDecimals } from "@/lib/utils";
import {
  canTransitionOrderStatus,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_TRACKING_STATUSES,
} from "@/lib/order-tracking";
import ActionButton from "../action-button";
import dynamic from "next/dynamic";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import CopyButton from "../copy-button";
import { OrderPdfDownloadLinks } from "./order-pdf-download-links";
import Price from "../menuItem/price";

const PaystackInline = dynamic(() => import("@/app/checkout/paystack-inline"), {
  ssr: false,
});

function CopyTrackingNumber({ trackingNumber }: { trackingNumber: string }) {
  return <CopyButton value={trackingNumber} />;
}

export default function OrderDetailsForm({
  order,
  isAdmin,
  accessToken,
}: {
  order: SerializedOrder;
  isAdmin: boolean;
  accessToken?: string;
}) {
  const orderId = order._id;
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(order.status);
  const [trackingStreamState, setTrackingStreamState] = useState<
    "connecting" | "live" | "fallback"
  >("connecting");
  const [liveTrackingMeta, setLiveTrackingMeta] = useState<{
    etaDriftMinutes?: number;
    routeDeviationM?: number;
    alertFlags?: string[];
    heartbeatAt?: string;
  } | null>(null);
  const hasRefreshedFromStreamRef = useRef(false);

  useEffect(() => {
    let source: EventSource | null = null;
    let mounted = true;

    try {
      source = new EventSource(
        `/api/tracking/${encodeURIComponent(order.trackingNumber)}/stream`,
      );
      source.addEventListener("tracking.update", (event) => {
        if (!mounted) return;
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          setTrackingStreamState("live");
          setLiveTrackingMeta({
            etaDriftMinutes: payload?.live?.etaDriftMinutes,
            routeDeviationM: payload?.live?.routeDeviationM,
            alertFlags: payload?.live?.latestAlertFlags || [],
            heartbeatAt: payload?.live?.heartbeatAt,
          });
          if (
            payload?.status &&
            payload.status !== order.status &&
            !hasRefreshedFromStreamRef.current
          ) {
            hasRefreshedFromStreamRef.current = true;
            router.refresh();
          }
        } catch {
          // no-op
        }
      });
      source.onerror = () => {
        if (!mounted) return;
        setTrackingStreamState("fallback");
      };
    } catch {
      setTrackingStreamState("fallback");
    }

    return () => {
      mounted = false;
      if (source) source.close();
    };
  }, [order.trackingNumber, order.status, router]);

  const availableStatuses = useMemo(() => {
    const currentStatus = order.status;
    const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus as any);

    return ORDER_TRACKING_STATUSES.filter((status) => {
      if (status === currentStatus) return true;

      const statusIndex = ORDER_STATUS_FLOW.indexOf(status as any);
      if (
        currentIndex !== -1 &&
        statusIndex !== -1 &&
        statusIndex > currentIndex
      ) {
        return true;
      }

      return canTransitionOrderStatus(currentStatus, status);
    });
  }, [order.status]);

  const timeline = useMemo(
    () =>
      [...(order.trackingHistory || [])].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [order.trackingHistory],
  );

  const {
    shippingAddress,
    items,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    paymentMethod: originalPaymentMethod,
    isPaid,
    paidAt,
    isDelivered,
    deliveredAt,
    expectedDeliveryDate,
    paymentResult,
  } = order;

  const paymentResultInfo = paymentResult as
    | Record<string, string | undefined>
    | undefined;

  const isCancelled =
    order.status === "cancelled" || order.paymentStatus === "cancelled";
  const paymentDueAmount = isPaid ? 0 : totalPrice;
  const hasOutstandingBalance = !isPaid && !isCancelled && paymentDueAmount > 0;

  return (
    <div className="grid md:grid-cols-3 gap-2 md:gap-5">
      <div className="overflow-x-auto md:col-span-2 space-y-4">
        <Card>
          <CardContent className="p-4 gap-4">
            <h2 className="text-xl pb-4">Shipping Address</h2>
            <div className="text-sm flex items-center gap-2 mb-2">
              Tracking Number: <CopyTrackingNumber trackingNumber={order.trackingNumber} />
            </div>
            <div className="text-sm flex items-center gap-2">
              Current Status: <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Live tracking channel: {trackingStreamState === "live" ? "connected" : "reconnecting"}
            </p>
            {liveTrackingMeta ? (
              <p className="text-xs text-muted-foreground">
                Heartbeat:{" "}
                {liveTrackingMeta.heartbeatAt
                  ? formatDateTime(new Date(liveTrackingMeta.heartbeatAt)).dateTime
                  : "N/A"}
                {liveTrackingMeta.etaDriftMinutes !== undefined
                  ? ` • ETA drift ${liveTrackingMeta.etaDriftMinutes} min`
                  : ""}
                {liveTrackingMeta.routeDeviationM !== undefined
                  ? ` • Deviation ${liveTrackingMeta.routeDeviationM} m`
                  : ""}
                {liveTrackingMeta.alertFlags?.length
                  ? ` • Alerts: ${liveTrackingMeta.alertFlags.join(", ")}`
                  : ""}
              </p>
            ) : null}
            <p className="text-sm">
              <Link
                className="underline text-blue-600 hover:text-blue-700"
                href={`/track/${order.trackingNumber}`}
              >
                Open tracking page
              </Link>
            </p>
            <p>
              {shippingAddress.fullName} {shippingAddress.phone}
            </p>
            <p>
              {shippingAddress.street}, {shippingAddress.city}, {" "}
              {shippingAddress.county}, {shippingAddress.postalCode}, {" "}
              {shippingAddress.country}{" "}
            </p>
            {order.note && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                <span className="font-semibold">Order note:</span> {order.note}
              </div>
            )}

            {isDelivered ? (
              <Badge variant="success">
                Delivered at {formatDateTime(deliveredAt!).dateTime}
              </Badge>
            ) : (
              <div>
                <Badge variant="pending">Not delivered</Badge>
                <div>
                  Arrives in about 30 mins (around {formatDateTime(expectedDeliveryDate!).timeOnly})
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 gap-4">
            <h2 className="text-xl pb-4">Payment Method</h2>
            <p>{originalPaymentMethod}</p>
            {isPaid ? (
              <Badge variant="success">Paid at {formatDateTime(paidAt!).dateTime}</Badge>
            ) : isCancelled ? (
              <Badge variant="destructive">Cancelled</Badge>
            ) : (
              <Badge variant="destructive">Not paid</Badge>
            )}
            {paymentResultInfo && (
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  <span className="font-semibold">Gateway:</span>{" "}
                  {paymentResultInfo.gateway ?? "paystack"}
                </p>
                <p>
                  <span className="font-semibold">Reference:</span>{" "}
                  {paymentResultInfo.paymentReference ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Transaction ID:</span>{" "}
                  {paymentResultInfo.id ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Channel:</span>{" "}
                  {paymentResultInfo.channel ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Currency:</span>{" "}
                  {paymentResultInfo.currency ?? "-"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 gap-4">
            <h2 className="text-xl pb-4">Order Items</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.slug}>
                    <TableCell className="truncate">
                      <Link href={`/menu-item/${item.slug}`} className="flex items-center">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={50}
                          height={50}
                          className="rounded-md"
                        />
                        <span className="px-2 font-medium w-48 truncate">{item.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Price price={item.price} plain />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 gap-4">
            <h2 className="text-xl pb-4">Tracking Timeline</h2>
            <OrderTimeline events={timeline} />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardContent className="p-4 space-y-4 gap-4">
            <h2 className="text-xl pb-4">Order Summary</h2>
            <div className="flex justify-between">
              <div>Items</div>
              <div><Price price={itemsPrice} plain /></div>
            </div>
            <div className="flex justify-between">
              <div>Tax</div>
              <div><Price price={taxPrice} plain /></div>
            </div>
            <div className="flex justify-between">
              <div>Shipping</div>
              <div><Price price={shippingPrice} plain /></div>
            </div>

            {order.coupon && (
              <div className="flex justify-between">
                <span>Coupon ({order.coupon.code}):</span>
                <span className="text-green-600">-<Price price={order.coupon.discountAmount} plain /></span>
              </div>
            )}

            {order.coinsRedeemed > 0 && (
              <div className="flex justify-between">
                <span>Coins Redeemed:</span>
                <span className="text-red-600">-{order.coinsRedeemed} coins</span>
              </div>
            )}

            {order.coinsEarned > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Coins to be earned:</span>
                <span>+{order.coinsEarned} coins</span>
              </div>
            )}

            <div className="flex justify-between pt-2 font-bold text-lg border-t">
              <span>Order Total:</span>
              <span><Price price={totalPrice} plain /></span>
            </div>

            <OrderPdfDownloadLinks orderId={orderId} />

            {hasOutstandingBalance &&
              (originalPaymentMethod === "Mobile Money (M-Pesa / Airtel) & Card" ||
                originalPaymentMethod === "Cash On Delivery") && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-xs text-center mb-3 text-muted-foreground">
                    This order is awaiting payment. Complete the full amount below.
                  </p>
                  <PaystackInline
                    email={(session?.user?.email || order.userEmail) as string}
                    amount={Math.round(paymentDueAmount * 100)}
                    publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!}
                    orderId={orderId}
                    buttonLabel={`Pay Full Balance: KSh ${formatNumberWithTwoDecimals(paymentDueAmount)}`}
                    className="w-full rounded-full h-12 font-bold shadow-md"
                    onSuccess={() => router.refresh()}
                    onFailure={() => router.refresh()}
                  />
                </div>
              )}

            {isAdmin &&
              !isPaid &&
              originalPaymentMethod === "Cash On Delivery" &&
              order.status !== "cancelled" && (
                <ActionButton
                  caption="Mark as paid"
                  action={() => updateOrderToPaid(orderId)}
                />
              )}

            {isAdmin && !["cancelled", "returned"].includes(order.status) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Order Status</label>
                <Select
                  value={nextStatus}
                  onValueChange={(value) =>
                    setNextStatus(value as typeof order.status)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {ORDER_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ActionButton
                  caption={
                    nextStatus === order.status
                      ? "Apply status"
                      : `Update to ${ORDER_STATUS_LABELS[nextStatus]}`
                  }
                  disabled={nextStatus === order.status}
                  className={cn(
                    "w-full transition-all",
                    nextStatus !== order.status &&
                      "bg-blue-600 hover:bg-blue-700 text-white shadow-md",
                  )}
                  action={async () => {
                    return updateOrderStatus({ orderId, status: nextStatus });
                  }}
                />
              </div>
            )}

            {isAdmin && isPaid && !isDelivered && order.status !== "cancelled" && (
              <ActionButton
                caption="Quick mark as delivered"
                action={() => deliverOrder(orderId)}
              />
            )}

            {isAdmin &&
              order.status === "returned" &&
              !order.isExchangeInitiated && (
                <ActionButton
                  caption="Initiate Exchange"
                  variant="outline"
                  requireConfirmation
                  disabled={order.status !== "returned" || order.isExchangeInitiated}
                  confirmationMessage="Are you sure you want to initiate an exchange for this order? The customer will be responsible for new delivery costs."
                  action={() => initiateExchange(orderId)}
                />
              )}

            {isAdmin && order.isExchangeInitiated && (
              <Badge
                variant="outline"
                className="w-full justify-center py-2 border-orange-500 text-orange-600"
              >
                Exchange Processed
              </Badge>
            )}

            {!isAdmin &&
              ["pending", "confirmed", "processing"].includes(order.status) && (
                <ActionButton
                  caption="Cancel Order"
                  variant="destructive"
                  requireConfirmation
                  confirmationMessage={
                    order.paymentMethod === "Coins"
                      ? "Are you sure you want to cancel this order? Any paid amount will be returned to your coin balance."
                      : "Are you sure you want to cancel this order? Any paid amount will be refunded to your wallet."
                  }
                  action={() => cancelOrder(orderId, accessToken)}
                />
              )}

            {!isAdmin &&
              order.status === "delivered" &&
              order.deliveredAt &&
              (() => {
                const deliveredDate = new Date(order.deliveredAt);
                const sevenDaysLater = new Date(deliveredDate);
                sevenDaysLater.setDate(deliveredDate.getDate() + 7);
                const isWithinWindow = new Date() <= sevenDaysLater;

                return isWithinWindow ? (
                  <ActionButton
                    caption="Return Order"
                    variant="outline"
                    requireConfirmation
                    confirmationMessage="Are you sure you want to request a return for this order? Returns must be approved by an admin."
                    action={() => requestReturnOrder(orderId)}
                  />
                ) : null;
              })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
