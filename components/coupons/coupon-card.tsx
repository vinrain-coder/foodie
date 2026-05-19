"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  EyeOff,
  Sparkles,
  Ticket,
  Clock3,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

import CopyButton from "../shared/copy-button";

import {
  canUseCoupon,
  getCouponDisplayMode,
  UserSession,
} from "@/lib/coupons/access-control";
import { UpgradeButton } from "./upgrade-button";

export interface CouponCardProps {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  tier: "free" | "premium";
  isPublished: boolean;
  minPurchase?: number;
  maxUsage?: number;
  usageCount: number;
  expiryDate: string | null;
  createdAt: string;
  premiumMembershipPrice: number;
  onCardClick?: () => void;
}

export function CouponCard({
  coupon,
  user,
  premiumMembershipPrice,
  onCardClick,
}: {
  coupon: CouponCardProps;
  user: UserSession | null;
  premiumMembershipPrice: number;
  onCardClick?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isPremium = coupon.tier === "premium";
  const displayMode = getCouponDisplayMode(user, coupon);
  const canUse = canUseCoupon(user, coupon);

  const isLocked = displayMode === "locked" || displayMode === "preview";
  const isPremiumLocked = isPremium && displayMode !== "full";
  const isFullView = displayMode === "full";

  const usagePercentage = coupon.maxUsage
    ? Math.min((coupon.usageCount / coupon.maxUsage) * 100, 100)
    : 0;

  const remainingUses = coupon.maxUsage
    ? Math.max(coupon.maxUsage - coupon.usageCount, 0)
    : null;

  const isSoldOut = coupon.maxUsage && coupon.usageCount >= coupon.maxUsage;

  const isExpired =
    coupon.expiryDate && new Date(coupon.expiryDate) < new Date();

  const isExpiringSoon =
    coupon.expiryDate &&
    new Date(coupon.expiryDate).getTime() - Date.now() <
      1000 * 60 * 60 * 24 * 3 &&
    !isExpired;

  const discountLabel =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}%`
      : formatCurrency(coupon.discountValue);

  const discountDescription =
    coupon.discountType === "percentage" ? "percent off" : "off";

  const handleUseCoupon = () => {
    if (!user) {
      toast("Sign in required", {
        description: "You must be logged in to use coupons.",
      });
      startTransition(() => {
        router.push("/sign-in?callbackUrl=/coupons");
      });
      return;
    }

    if (!canUse.allowed) {
      toast("Cannot apply coupon", {
        description: canUse.reason,
      });
      return;
    }

    toast("Coupon applied!", {
      description: `${coupon.code} copied. Apply it at checkout.`,
    });
    startTransition(() => {
      router.push(`/shop?coupon=${coupon.code}`);
    });
  };

  return (
    <article
      aria-label={`Coupon ${isLocked && !isFullView ? "locked" : coupon.code}`}
      className="group relative"
    >
<Card
         className={cn(
           "relative overflow-hidden rounded-3xl border transition-all duration-300 ease-out",
           "hover:-translate-y-1 hover:shadow-2xl focus-within:-translate-y-1 focus-within:shadow-2xl",
           isPremium
             ? "border-amber-200/60 bg-linear-to-br from-white via-amber-50/40 to-yellow-50/30"
             : "border-border bg-background",
           isSoldOut || isExpired
             ? "opacity-70 grayscale-[0.15] cursor-not-allowed"
             : "cursor-pointer",
         )}
         onClick={isSoldOut || isExpired || isLocked ? undefined : onCardClick}
       >
        {/* Premium shimmer overlay */}
        {isPremium && (
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden="true"
          >
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-amber-400/30 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-20 w-full bg-linear-to-t from-amber-100/20 to-transparent" />
          </div>
        )}

        {/* Decorative dots */}
        <div
          className="absolute -left-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full border bg-background md:block"
          aria-hidden="true"
        />
        <div
          className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full border bg-background md:block"
          aria-hidden="true"
        />

        {/* LOCKED OVERLAY */}
        {isPremiumLocked && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/75 backdrop-blur-md"
            aria-label="Premium upgrade required"
          >
            <div className="mx-6 w-full max-w-sm rounded-2xl border bg-background/95 p-8 text-center shadow-2xl backdrop-blur-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100/80">
                <Lock className="h-7 w-7 text-amber-600" />
              </div>

              <h3 className="text-lg font-semibold text-foreground">
                {isPremium ? "Premium Coupon" : "Locked"}
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                {displayMode === "preview"
                  ? "Sign in to reveal this premium coupon"
                  : "Upgrade to Premium to unlock exclusive deals"}
              </p>

              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                {displayMode === "preview" && (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/sign-in?callbackUrl=/coupons">Log In</Link>
                  </Button>
                )}

                {displayMode === "locked" && (
                  <UpgradeButton user={user} price={premiumMembershipPrice} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* EXPIRED / SOLD OUT OVERLAY */}
        {(isExpired || isSoldOut) && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center"
            aria-label={isExpired ? "Expired coupon" : "Sold out coupon"}
          >
            <div className="rounded-2xl border border-border/60 bg-background/90 px-6 py-4 text-center shadow-lg backdrop-blur-sm">
              <div
                className={cn(
                  "mx-auto mb-2 h-10 w-10 rounded-full flex items-center justify-center",
                  isExpired
                    ? "bg-rose-100 text-rose-600"
                    : "bg-amber-100 text-amber-600",
                )}
              >
                {isExpired ? (
                  <Clock3 className="h-5 w-5" />
                ) : (
                  <span className="text-lg font-bold">✕</span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {isExpired ? "Expired" : "Sold Out"}
              </p>
            </div>
          </div>
        )}

        {/* CARD HEADER */}
        <CardHeader className="relative pb-4 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* LEFT */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    isPremium
                      ? "bg-linear-to-br from-amber-100 to-yellow-100 text-amber-600 shadow-sm"
                      : "bg-primary/10 text-primary",
                  )}
                  aria-hidden="true"
                >
                  {isPremium ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <Ticket className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-foreground">
                      {discountLabel}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {discountDescription}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coupon code */}
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Coupon code"
              >
                {isFullView ? (
                  <>
                    <div
                      className="rounded-2xl border bg-muted/60 px-4 py-2.5 font-mono text-base font-bold tracking-[0.2em] shadow-sm"
                      aria-label={`Coupon code: ${coupon.code}`}
                    >
                      {coupon.code}
                    </div>
                    <CopyButton value={coupon.code} />
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div
                      className="rounded-2xl border border-dashed bg-muted/50 px-4 py-2.5 font-mono text-base tracking-[0.2em] text-muted-foreground"
                      aria-hidden="true"
                    >
                      ••••••••••
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="rounded-full">
                            <EyeOff className="mr-1 h-3 w-3" />
                            Hidden
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sign in to reveal this coupon</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT – Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm",
                  isPremium
                    ? "bg-linear-to-r from-amber-400 to-yellow-500 text-white"
                    : "bg-primary/10 text-primary hover:bg-primary/15",
                )}
                variant={isPremium ? "default" : "secondary"}
              >
                {isPremium ? (
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Premium
                  </span>
                ) : (
                  "Free"
                )}
              </Badge>

              {isExpiringSoon && !isSoldOut && (
                <Badge className="rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100">
                  <Clock3 className="mr-1 h-3 w-3" />
                  Ending Soon
                </Badge>
              )}

              {isSoldOut && (
                <Badge
                  variant="destructive"
                  className="rounded-full bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                >
                  Sold Out
                </Badge>
              )}

              {isExpired && (
                <Badge
                  variant="secondary"
                  className="rounded-full bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                >
                  Expired
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {/* CARD CONTENT */}
        <CardContent className="relative space-y-3">
          <div className="grid gap-2.5 rounded-2xl border bg-muted/30 p-4 text-sm">
            {(coupon.minPurchase || coupon.minPurchase === 0) && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  Minimum Purchase
                </span>
                <span className="font-medium text-foreground">
                  {coupon.minPurchase
                    ? formatCurrency(coupon.minPurchase)
                    : "None"}
                </span>
              </div>
            )}

            {coupon.expiryDate && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 shrink-0" />
                  Expires
                </span>
                <span
                  className={cn(
                    "font-medium",
                    isExpiringSoon
                      ? "text-orange-600"
                      : isExpired
                        ? "text-rose-500"
                        : "text-foreground",
                  )}
                >
                  {new Date(coupon.expiryDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {isExpiringSoon && (
                    <span className="ml-1 text-[10px] font-normal opacity-70">
                      (3 days)
                    </span>
                  )}
                </span>
              </div>
            )}

            {coupon.maxUsage && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Avail. Uses
                </span>
                <span className="font-medium text-foreground">
                  {remainingUses} of {coupon.maxUsage}
                </span>
              </div>
            )}
          </div>

          {/* Progress */}
          {coupon.isPublished && coupon.maxUsage && (
            <div
              className="space-y-1.5"
              role="progressbar"
              aria-valuenow={usagePercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium text-muted-foreground">
                  {coupon.usageCount} / {coupon.maxUsage}
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    isSoldOut
                      ? "bg-linear-to-r from-rose-400 to-rose-500"
                      : isExpiringSoon
                        ? "bg-linear-to-r from-orange-400 to-orange-500"
                        : "from-amber-400 to-orange-400 bg-linear-to-r",
                  )}
                  style={{ width: `${usagePercentage}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 w-8 bg-linear-to-l from-transparent to-white/20"
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          {/* Alerts */}
          {isExpired && (
            <div
              className="rounded-2xl border border-rose-200/60 bg-rose-50/80 px-4 py-3 text-sm text-rose-700"
              role="alert"
            >
              <span className="font-medium">⏰ Expired</span> — This coupon has
              expired and can no longer be used.
            </div>
          )}

          {isSoldOut && !isExpired && (
            <div
              className="rounded-2xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-700"
              role="alert"
            >
              <span className="font-medium">⚠️ Limited</span> — This coupon has
              reached its usage limit.
            </div>
          )}

          {!canUse.allowed && !isLocked && !isSoldOut && !isExpired && (
            <div
              className="rounded-2xl border border-muted-foreground/20 bg-muted/50 px-4 py-3 text-xs text-muted-foreground"
              role="status"
            >
              {canUse.reason}
            </div>
          )}
        </CardContent>

        {/* CARD FOOTER */}
        <CardFooter className="relative pt-2 pb-5">
          {!isLocked && !isSoldOut && !isExpired && coupon.isPublished && (
            <Button
              className={cn(
                "w-full rounded-2xl font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]",
                isPremium
                  ? "bg-linear-to-r from-amber-500 to-yellow-500 text-white shadow-amber-200/30 hover:from-amber-600 hover:to-yellow-600"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground",
              )}
              disabled={isPending}
              onClick={handleUseCoupon}
            >
              {isPending ? (
                "Processing…"
              ) : (
                <>
                  <Ticket className="h-4 w-4 mr-2" />
                  Use Coupon
                </>
              )}
            </Button>
          )}

          {isPremiumLocked && (
            <div className="w-full pt-2">
              <p className="text-center text-xs text-muted-foreground">
                Upgrade to Premium to unlock{" "}
                {coupon.discountType === "percentage"
                  ? `${coupon.discountValue}%`
                  : formatCurrency(coupon.discountValue)}{" "}
                savings
              </p>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Expiring Soon pulse ring */}
      {isExpiringSoon && !isSoldOut && !isExpired && (
        <div
          className="absolute -inset-1 -z-10 rounded-3xl border-2 border-orange-300 opacity-50 blur-sm"
          aria-hidden="true"
        />
      )}
    </article>
  );
}
