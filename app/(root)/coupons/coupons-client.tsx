"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CouponCard } from "@/components/coupons/coupon-card";
import type { CouponCardProps } from "@/components/coupons/coupon-card";

import { UserSession } from "@/lib/coupons/access-control";

import { UpgradeButton } from "@/components/coupons/upgrade-button";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/utils";

import {
  ArrowUpDown,
  Filter,
  Lock,
  Search,
  SlidersHorizontal,
  Tag as TagIcon,
  Ticket,
} from "lucide-react";

type SortOption = "newest" | "discount-high" | "discount-low" | "expiry-soon";

type FilterOption = "all" | "active" | "ending-soon" | "premium" | "free";

interface CouponsPageProps {
  user: UserSession | null;
  coupons: CouponCardProps[];
  isPremium: boolean;
  premiumMembershipPrice: number;
}

export default function CouponsClientLayout({
  user,
  coupons: allCoupons,
  isPremium,
  premiumMembershipPrice,
}: CouponsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");

  const [activeSort, setActiveSort] = useState<SortOption>("newest");

  const [, startTransition] = useTransition();

  const router = useRouter();

  const isLoggedInUser = !!user;

  const stats = useMemo(() => {
    const active = allCoupons.filter(
      (c) =>
        c.isPublished && (!c.expiryDate || new Date(c.expiryDate) > new Date()),
    ).length;

    const free = allCoupons.filter((c) => c.tier === "free").length;

    const premium = allCoupons.filter((c) => c.tier === "premium").length;

    const maxDiscount = allCoupons
      .filter((c) => c.discountType === "percentage")
      .reduce((max, c) => (c.discountValue > max ? c.discountValue : max), 0);

    return {
      totalCoupons: allCoupons.length,
      active,
      free,
      premium,
      maxDiscount,
    };
  }, [allCoupons]);

  const filteredAndSortedCoupons = useMemo(() => {
    let result = [...allCoupons];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(query) ||
          c.discountType.toLowerCase().includes(query) ||
          c.tier.toLowerCase().includes(query),
      );
    }

    switch (activeFilter) {
      case "active":
        result = result.filter(
          (c) =>
            c.isPublished &&
            (!c.expiryDate || new Date(c.expiryDate) > new Date()) &&
            (!c.maxUsage || c.usageCount < c.maxUsage),
        );
        break;

      case "ending-soon":
        result = result.filter(
          (c) =>
            c.isPublished &&
            c.expiryDate &&
            new Date(c.expiryDate).getTime() - Date.now() <
              1000 * 60 * 60 * 24 * 3 &&
            new Date(c.expiryDate) > new Date(),
        );
        break;

      case "premium":
        result = result.filter((c) => c.tier === "premium");
        break;

      case "free":
        result = result.filter((c) => c.tier === "free");
        break;
    }

    switch (activeSort) {
      case "discount-high":
        result.sort((a, b) => b.discountValue - a.discountValue);
        break;

      case "discount-low":
        result.sort((a, b) => a.discountValue - b.discountValue);
        break;

      case "expiry-soon":
        result.sort((a, b) => {
          if (!a.expiryDate) return 1;

          if (!b.expiryDate) return -1;

          return (
            new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
          );
        });
        break;

      case "newest":
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );
    }

    return result;
  }, [allCoupons, searchQuery, activeFilter, activeSort]);

  const handleCouponClick = (coupon: CouponCardProps) => {
    if (!isLoggedInUser) {
      startTransition(() => {
        router.push("/sign-in?callbackUrl=/coupons");
      });

      return;
    }

    startTransition(() => {
      router.push(`/shop?coupon=${coupon.code}`);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Ticket className="mr-2 h-4 w-4" />
              Exclusive Deals
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              <span className="block">Unlock Great Savings</span>

              <span className="block bg-linear-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                with Exclusive Coupons
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {isPremium
                ? "Enjoy your premium benefits — access handpicked deals and exclusive savings."
                : isLoggedInUser
                  ? "Upgrade to Premium to unlock high-value premium coupons and more perks."
                  : "Sign in to discover all available deals. Premium members get exclusive high-value coupons."}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute top-0 right-0 h-60 w-60 opacity-[0.04]">
          <div className="h-full w-full rounded-full bg-primary" />
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 h-60 w-60 opacity-[0.04]">
          <div className="h-full w-full rounded-full bg-amber-500" />
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 -mt-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
            <div className="text-2xl font-extrabold">{stats.active}</div>

            <div className="mt-1 text-xs text-muted-foreground">
              Active Coupons
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
            <div className="text-2xl font-extrabold text-primary">
              {stats.free}
            </div>

            <div className="mt-1 text-xs text-muted-foreground">Free Tier</div>
          </div>

          <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
            <div className="text-2xl font-extrabold text-amber-600">
              {stats.premium}
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Premium Tier
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 text-center shadow-sm">
            <div className="text-2xl font-extrabold text-emerald-600">
              {stats.maxDiscount}%
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Max Discount
            </div>
          </div>
        </div>
      </section>

      <Separator className="my-6" />

      <main className="container mx-auto px-4 pb-16">
        {!isLoggedInUser && (
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-linear-to-br from-amber-500/10 via-background to-orange-500/5 p-6 shadow-sm backdrop-blur">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_35%)]" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/20">
                    <Lock className="h-6 w-6 text-amber-500" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      Welcome, Guest
                    </h3>

                    <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                      Sign in to unlock all free coupons and gain access to
                      premium exclusive deals with higher discounts and
                      member-only savings.
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  size="lg"
                  className="h-11 rounded-xl px-6 lg:shrink-0"
                >
                  <Link href="/sign-in?callbackUrl=/coupons">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoggedInUser && !isPremium && (
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-linear-to-br from-primary/10 via-background to-amber-500/5 p-6 shadow-sm backdrop-blur">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_35%)]" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/20">
                    <span className="text-2xl">👑</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        Upgrade to Premium
                      </h3>

                      <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                        Recommended
                      </div>
                    </div>

                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Unlock premium coupons, exclusive high-value discounts,
                      early-access deals, and priority savings available only to
                      premium members.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border">
                        Unlimited coupon access
                      </div>

                      <div className="rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border">
                        Exclusive premium discounts
                      </div>

                      <div className="rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border">
                        Priority access
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col">
                  <UpgradeButton user={user} price={premiumMembershipPrice} />

                  <p className="text-center text-xs text-muted-foreground">
                    One-time upgrade • Instant access
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="hidden h-4 w-4 text-muted-foreground sm:block" />

            <span className="text-sm font-medium text-muted-foreground">
              {filteredAndSortedCoupons.length} coupon
              {filteredAndSortedCoupons.length !== 1 && "s"} found
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="search"
                placeholder="Search coupons..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select
              value={activeFilter}
              onValueChange={(v: FilterOption) => setActiveFilter(v)}
            >
              <SelectTrigger className="w-40">
                <SlidersHorizontal className="mr-2 h-4 w-4" />

                <SelectValue placeholder="Filter" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Coupons</SelectItem>

                <SelectItem value="active">Active Only</SelectItem>

                <SelectItem value="ending-soon">Ending Soon</SelectItem>

                <SelectItem value="premium">Premium</SelectItem>

                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={activeSort}
              onValueChange={(v: SortOption) => setActiveSort(v)}
            >
              <SelectTrigger className="w-42.5">
                <ArrowUpDown className="mr-2 h-4 w-4" />

                <SelectValue placeholder="Sort" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>

                <SelectItem value="discount-high">Highest Discount</SelectItem>

                <SelectItem value="discount-low">Lowest Discount</SelectItem>

                <SelectItem value="expiry-soon">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Coupons */}
        {filteredAndSortedCoupons.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedCoupons.map((coupon) => (
              <CouponCard
                key={coupon._id}
                coupon={coupon}
                user={user}
                premiumMembershipPrice={premiumMembershipPrice}
                onCardClick={() => handleCouponClick(coupon)}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-16 text-center"
            role="status"
          >
            <div
              className={cn(
                "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
                isLoggedInUser
                  ? "bg-gray-100 text-gray-400"
                  : "bg-amber-100 text-amber-500",
              )}
            >
              {isLoggedInUser ? (
                <TagIcon className="h-8 w-8" />
              ) : (
                <Lock className="h-8 w-8" />
              )}
            </div>

            <h3 className="text-lg font-semibold">
              {isLoggedInUser
                ? "No coupons match your filters"
                : "Sign in to discover more deals"}
            </h3>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {isLoggedInUser
                ? "Try adjusting your search or filters."
                : "Login to unlock free coupons and premium deals."}
            </p>

            {!isLoggedInUser && (
              <Button asChild className="mt-4" variant="outline">
                <Link href="/sign-in?callbackUrl=/coupons">Sign In</Link>
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
