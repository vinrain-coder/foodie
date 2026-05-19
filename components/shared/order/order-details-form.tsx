"use client";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "./order-status-badge";
import OrderTimeline from "./order-timeline";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useMemo, useState, useEffect } from "react";
import {
  BNPLPaymentListItem,
  getBNPLPaymentHistory,
  processBNPLRepayment,
} from "@/lib/actions/bnpl.actions";
import { getUserCoins, getUserWalletBalance } from "@/lib/actions/user.actions";
import { Coins, Wallet, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
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

  const availableStatuses = useMemo(() => {
    const currentStatus = order.status;
    const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus as any);

    return ORDER_TRACKING_STATUSES.filter((status) => {
      if (status === currentStatus) return true;

      // Forward in flow
      const statusIndex = ORDER_STATUS_FLOW.indexOf(status as any);
      if (
        currentIndex !== -1 &&
        statusIndex !== -1 &&
        statusIndex > currentIndex
      ) {
        return true;
      }

      // Explicitly allowed transitions
      return canTransitionOrderStatus(currentStatus, status);
    });
  }, [order.status]);

  const [paymentHistory, setPaymentHistory] = useState<BNPLPaymentListItem[]>(
    [],
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "paystack" | "wallet" | "coins"
  >("paystack");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (session?.user?.id) {
      getUserCoins().then(setCoins);
      getUserWalletBalance().then(setWalletBalance);
    }
  }, [session?.user?.id]);

  const displayedRemaining = order.remainingAmount ?? order.totalPrice;

  const initialAmount = order.minimumPayment || displayedRemaining || 0;
  const [repaymentCents, setRepaymentCents] = useState(
    Math.round(initialAmount * 100),
  );

  useEffect(() => {
    const nextAmount = order.minimumPayment || displayedRemaining || 0;
    setRepaymentCents(Math.round(nextAmount * 100));
  }, [order.minimumPayment, displayedRemaining, order.updatedAt]);

  const repaymentAmount = repaymentCents / 100;
  const maxCents = Math.round(displayedRemaining * 100);
  const minCents = 0;

  useEffect(() => {
    if (displayedRemaining < order.totalPrice || order.paymentType === "bnpl") {
      setLoadingHistory(true);
      getBNPLPaymentHistory(orderId, accessToken)
        .then((res) => {
          if (res.success) {
            setPaymentHistory(res.data || []);
          }
        })
        .finally(() => setLoadingHistory(false));
    }
  }, [
    orderId,
    order.paymentType,
    displayedRemaining,
    order.totalPrice,
    accessToken,
  ]);

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

  const handleBalancePayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await processBNPLRepayment({
        orderId,
        amount: repaymentAmount,
        paymentMethod: paymentMethod === "wallet" ? "Wallet" : "Coins",
        source: paymentMethod as "wallet" | "coins",
        accessToken,
      });

      if (res.success) {
        toast.success("Payment Successful", {
          description: res.message,
        });
        if (session?.user?.id) {
          getUserCoins().then(setCoins);
          getUserWalletBalance().then(setWalletBalance);
        }
        getBNPLPaymentHistory(orderId, accessToken).then((h) => {
          if (h.success) {
            setPaymentHistory(h.data || []);
          }
        });
        router.refresh();
      } else {
        toast.error("Payment Failed", {
          description: res.message,
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCancelled =
    order.status === "cancelled" ||
    order.paymentStatus === "cancelled" ||
    order.financingStatus === "cancelled";

  const hasOutstandingBalance =
    !isPaid && !isCancelled && displayedRemaining > 0.01;

  const isPaymentBlocked = isPaid || isCancelled || displayedRemaining <= 0;
  const isOnlinePaymentDisabled = repaymentCents <= 0 || isPaymentBlocked;

  return (
    <div className="grid md:grid-cols-3 gap-2 md:gap-5">
      <div className="overflow-x-auto md:col-span-2 space-y-4">
        <Card>
          <CardContent className="p-4 gap-4">
            <h2 className="text-xl pb-4">Shipping Address</h2>
            <div className="text-sm flex items-center gap-2 mb-2">
              Tracking Number:{" "}
              <CopyTrackingNumber trackingNumber={order.trackingNumber} />
            </div>
            <div className="text-sm flex items-center gap-2">
              Current Status: <OrderStatusBadge status={order.status} />
            </div>
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
              {shippingAddress.street}, {shippingAddress.city},{" "}
              {shippingAddress.province}, {shippingAddress.postalCode},{" "}
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
                {" "}
                <Badge variant="pending">Not delivered</Badge>
                <div>
                  Expected delivery at{" "}
                  {formatDateTime(expectedDeliveryDate!).dateTime}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 gap-4">
            <h2 className="text-xl pb-4">Payment Method</h2>
            <p>{originalPaymentMethod}</p>
            {order.paymentType === "bnpl" && (
              <div className="my-2">
                <Badge
                  variant={
                    isCancelled
                      ? "destructive"
                      : order.paymentStatus === "paid"
                        ? "success"
                        : "outline"
                  }
                  className={cn(
                    !isCancelled &&
                      order.paymentStatus !== "paid" &&
                      "text-blue-600 border-blue-600",
                  )}
                >
                  BNPL - {order.paymentStatus.toUpperCase()}
                </Badge>
                <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                  {/* Paid */}
                  <div className="rounded-lg border border-green-100 dark:border-green-900 bg-green-50/40 dark:bg-green-900/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Paid
                    </p>
                    <p className="text-green-600 font-bold text-base">
                      <Price price={order.amountPaid || 0} plain />
                    </p>
                  </div>

                  {/* Remaining */}
                  <div className="rounded-lg border border-red-100 dark:border-red-900 bg-red-50/40 dark:bg-red-900/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Remaining
                    </p>
                    <p className="text-red-600 font-bold text-base">
                      <Price price={displayedRemaining} plain />
                    </p>
                  </div>

                  {/* Total */}
                  <div className="rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-900/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total
                    </p>
                    <p className="text-blue-600 font-bold text-base">
                      <Price price={order.totalPrice} plain />
                    </p>
                  </div>
                </div>
              </div>
            )}
            {isPaid ? (
              <Badge variant="success">
                Paid at {formatDateTime(paidAt!).dateTime}
              </Badge>
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
                      <Link
                        href={`/menu-item/${item.slug}`}
                        className="flex items-center"
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={50}
                          height={50}
                          className="rounded-md"
                        />
                        <span className="px-2 font-medium w-48 truncate">
                          {item.name}
                        </span>
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

        {hasOutstandingBalance && (
          <Card
            className={cn(
              "shadow-sm overflow-hidden border",
              order.paymentType === "bnpl"
                ? "border-blue-100 dark:border-blue-900"
                : "border-slate-200 dark:border-slate-800",
            )}
          >
            <div
              className={cn(
                "px-4 py-4 border-b",
                order.paymentType === "bnpl"
                  ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900"
                  : "bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800",
              )}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2 h-6 rounded-full",
                      order.paymentType === "bnpl"
                        ? "bg-blue-600"
                        : "bg-primary",
                    )}
                  />
                  {order.paymentType === "bnpl"
                    ? "Financing Overview"
                    : "Payment Balance"}
                </h2>
                {order.paymentType === "bnpl" && (
                  <Badge
                    variant={
                      order.financingStatus === "overdue"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {order.financingStatus?.toUpperCase()}
                  </Badge>
                )}
              </div>

              {order.paymentType === "bnpl" && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Repayment Progress</span>
                    <span className="font-bold">
                      {order.repaymentProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{ width: `${order.repaymentProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <CardContent className="p-4 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Remaining Balance
                  </p>
                  <div className="text-lg font-bold text-blue-600">
                    <Price price={displayedRemaining} plain />
                  </div>
                </div>
                {order.paymentType === "bnpl" && (
                  <>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Due Date
                      </p>
                      <p className="font-medium text-sm">
                        {order.bnplDueDate
                          ? formatDateTime(new Date(order.bnplDueDate)).dateOnly
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Next Suggested
                      </p>
                      <div className="font-medium text-sm">
                        <Price price={order.minimumPayment || 0} plain />
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        Status
                      </p>
                      <Badge
                        variant={
                          order.financingStatus === "overdue"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {order.financingStatus?.toUpperCase()}
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold block mb-3">
                      Choose Repayment Amount
                    </label>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                      <span className="text-sm font-bold text-muted-foreground">
                        KSh
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        disabled={isPaymentBlocked}
                        onKeyDown={(e) => {
                          if (["e", "E", "+", "-"].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        value={repaymentAmount || ""}
                        min={minCents / 100}
                        max={maxCents / 100}
                        step="0.01"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value;

                          // Allow empty field while typing
                          if (raw === "") {
                            setRepaymentCents(0);
                            return;
                          }

                          // Prevent invalid characters like "e", "+"
                          const val = Number(raw);

                          if (Number.isNaN(val)) return;

                          // Clamp safely
                          const clamped = Math.min(
                            Math.max(val, minCents / 100),
                            maxCents / 100,
                          );

                          setRepaymentCents(Math.round(clamped * 100));
                        }}
                        onBlur={() => {
                          // Auto-fix empty or zero on blur
                          if (repaymentCents < minCents) {
                            setRepaymentCents(minCents);
                          }
                        }}
                        className="flex-1 h-9 border-none bg-transparent p-0 font-bold focus-visible:ring-0 text-lg"
                      />
                    </div>

                    <Slider
                      value={[repaymentCents]}
                      disabled={isPaymentBlocked}
                      min={0}
                      max={maxCents}
                      step={1}
                      onValueChange={([val]) => setRepaymentCents(val)}
                      className="py-2 cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                      <span>
                        Min: KSh {formatNumberWithTwoDecimals(minCents / 100)}
                      </span>
                      <span>
                        Max: <Price price={displayedRemaining} plain />
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold block mb-3">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          if (isOnlinePaymentDisabled) return;
                          setPaymentMethod("paystack");
                        }}
                        disabled={isOnlinePaymentDisabled}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 cursor-pointer",
                          paymentMethod === "paystack"
                            ? "border-primary bg-primary/5"
                            : "border-slate-100 dark:border-slate-800 hover:border-slate-300",
                          isOnlinePaymentDisabled &&
                            "opacity-40 cursor-not-allowed",
                        )}
                      >
                        <CreditCard className="h-5 w-5" />
                        <span className="text-[10px] font-bold">Online</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod("wallet")}
                        disabled={
                          walletBalance === null ||
                          walletBalance <= 0 ||
                          isPaymentBlocked
                        }
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 relative cursor-pointer",
                          paymentMethod === "wallet"
                            ? "border-primary bg-primary/5"
                            : "border-slate-100 dark:border-slate-800 hover:border-slate-300",
                          (walletBalance === null ||
                            walletBalance <= 0 ||
                            isPaymentBlocked) &&
                            "opacity-50 cursor-not-allowed grayscale",
                        )}
                      >
                        <Wallet className="h-5 w-5" />
                        <span className="text-[10px] font-bold">Wallet</span>
                        {walletBalance !== null && (
                          <span className="text-[8px] absolute -top-2 bg-green-100 text-green-700 px-1 rounded-md border border-green-200">
                            {formatNumberWithTwoDecimals(walletBalance)}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setPaymentMethod("coins")}
                        disabled={
                          coins === null || coins <= 0 || isPaymentBlocked
                        }
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 relative cursor-pointer",
                          paymentMethod === "coins"
                            ? "border-primary bg-primary/5"
                            : "border-slate-100 dark:border-slate-800 hover:border-slate-300",
                          (coins === null || coins <= 0 || isPaymentBlocked) &&
                            "opacity-50 cursor-not-allowed grayscale",
                        )}
                      >
                        <Coins className="h-5 w-5" />
                        <span className="text-[10px] font-bold">Coins</span>
                        {coins !== null && (
                          <span className="text-[8px] absolute -top-2 bg-orange-100 text-orange-700 px-1 rounded-md border border-orange-200">
                            {formatNumberWithTwoDecimals(coins)}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="pt-2">
                      {paymentMethod === "paystack" ? (
                        <div className="flex flex-col gap-2">
                          {!isOnlinePaymentDisabled ? (
                            <PaystackInline
                              email={
                                (session?.user?.email ||
                                  order.userEmail) as string
                              }
                              amount={repaymentCents}
                              publicKey={
                                process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!
                              }
                              orderId={orderId}
                              metadata={{
                                type: "bnpl_repayment",
                                orderId: orderId,
                              }}
                              buttonLabel={`Pay KSh ${formatNumberWithTwoDecimals(repaymentAmount)}`}
                              className="w-full h-11 font-bold rounded-xl shadow-sm"
                              onSuccess={() => {
                                getBNPLPaymentHistory(
                                  orderId,
                                  accessToken,
                                ).then((res) => {
                                  if (res.success) {
                                    setPaymentHistory(res.data || []);
                                  }
                                });
                                router.refresh();
                              }}
                            />
                          ) : (
                            <Button disabled className="w-full h-11 rounded-xl">
                              Enter a valid amount to continue
                            </Button>
                          )}
                          <p className="text-[10px] text-center text-muted-foreground italic">
                            Secured by Paystack
                          </p>
                        </div>
                      ) : (
                        <Button
                          onClick={handleBalancePayment}
                          disabled={
                            isSubmitting ||
                            repaymentCents <= 0 ||
                            isPaymentBlocked ||
                            (paymentMethod === "wallet" &&
                              (walletBalance || 0) < repaymentAmount) ||
                            (paymentMethod === "coins" &&
                              (coins || 0) < repaymentAmount)
                          }
                          className="w-full h-11 font-bold rounded-xl shadow-sm"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : paymentMethod === "wallet" ? (
                            <Wallet className="h-4 w-4 mr-2" />
                          ) : (
                            <Coins className="h-4 w-4 mr-2" />
                          )}
                          Pay KSh {formatNumberWithTwoDecimals(repaymentAmount)}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 gap-4">
            <h2 className="text-xl pb-4">Tracking Timeline</h2>
            <OrderTimeline events={timeline} />
          </CardContent>
        </Card>

        {(displayedRemaining < order.totalPrice ||
          order.paymentType === "bnpl" ||
          isCancelled) && (
          <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-sm font-bold">Repayment History</h2>
            </div>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="p-4 text-center text-sm text-muted-foreground italic">
                  Loading history...
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground italic">
                  No repayments recorded yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right pr-4">Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell className="pl-4 text-xs">
                          {formatDateTime(new Date(payment.createdAt)).dateTime}
                        </TableCell>
                        <TableCell className="font-bold text-xs">
                          <Price price={payment.amount} plain />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase"
                          >
                            {payment.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4 text-xs text-muted-foreground">
                          {payment.paymentMethod}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <div>
        <Card>
          <CardContent className="p-4 space-y-4 gap-4">
            <h2 className="text-xl pb-4">Order Summary</h2>
            <div className="flex justify-between">
              <div>Items</div>
              <div>
                {" "}
                <Price price={itemsPrice} plain />
              </div>
            </div>
            <div className="flex justify-between">
              <div>Tax</div>
              <div>
                {" "}
                <Price price={taxPrice} plain />
              </div>
            </div>
            <div className="flex justify-between">
              <div>Shipping</div>
              <div>
                {" "}
                <Price price={shippingPrice} plain />
              </div>
            </div>
            {order.coupon && (
              <div className="flex justify-between">
                <span>Coupon ({order.coupon.code}):</span>
                <span className="text-green-600">
                  -<Price price={order.coupon.discountAmount} plain />
                </span>
              </div>
            )}
            {order.coinsRedeemed > 0 && (
              <div className="flex justify-between">
                <span>Coins Redeemed:</span>
                <span className="text-red-600">
                  -{order.coinsRedeemed} coins
                </span>
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
              <span>
                <Price price={totalPrice} plain />
              </span>
            </div>
            <OrderPdfDownloadLinks orderId={orderId} />
            {!isPaid &&
              displayedRemaining > 0 &&
              (originalPaymentMethod ===
                "Mobile Money (M-Pesa / Airtel) & Card" ||
                originalPaymentMethod === "Cash On Delivery") && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-xs text-center mb-3 text-muted-foreground">
                    This order is awaiting payment. You can pay in full or make
                    a partial payment above.
                  </p>
                  <PaystackInline
                    email={(session?.user?.email || order.userEmail) as string}
                    amount={Math.round(displayedRemaining * 100)}
                    publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!}
                    orderId={orderId}
                    buttonLabel={`Pay Full Balance: KSh ${formatNumberWithTwoDecimals(displayedRemaining)}`}
                    className="w-full rounded-full h-12 font-bold shadow-md"
                    onSuccess={() => {
                      getBNPLPaymentHistory(orderId, accessToken).then((h) => {
                        if (h.success) {
                          setPaymentHistory(h.data || []);
                        }
                      });
                      router.refresh();
                    }}
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
                <label className="text-sm font-medium">
                  Update Order Status
                </label>
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
            {isAdmin &&
              isPaid &&
              !isDelivered &&
              order.status !== "cancelled" && (
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
                  disabled={
                    order.status !== "returned" || order.isExchangeInitiated
                  }
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
