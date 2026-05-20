"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Store,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LayoutPanelTop,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RestaurantApplicationStatusCardsProps {
  stats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    active: number;
    inactive: number;
  };
  currentStatus?: string;
  currentActivity?: string;
}

export default function RestaurantApplicationStatusCards({
  stats,
  currentStatus = "all",
  currentActivity = "all",
}: RestaurantApplicationStatusCardsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  const handleStatusClick = (target: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target === "all") {
      params.delete("status");
      params.delete("activity");
    } else if (target === "active" || target === "inactive") {
      params.delete("status");
      params.set("activity", target);
    } else {
      params.delete("activity");
      params.set("status", target);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  const statConfig = [
    {
      id: "all",
      label: "Total",
      value: stats.total,
      icon: Store,
      color:
        "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    },
    {
      id: "approved",
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle2,
      color:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    },
    {
      id: "pending",
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    },
    {
      id: "rejected",
      label: "Rejected",
      value: stats.rejected,
      icon: AlertCircle,
      color:
        "bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    },
    {
      id: "active",
      label: "Active",
      value: stats.active,
      icon: CheckCircle2,
      color:
        "bg-teal-100 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
    },
    {
      id: "inactive",
      label: "Suspended",
      value: stats.inactive,
      icon: AlertCircle,
      color:
        "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutPanelTop className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Restaurant Overview</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="h-8 gap-1 text-xs"
        >
          {isVisible ? (
            <>
              Hide Stats <ChevronUp className="size-3" />
            </>
          ) : (
            <>
              Show Stats <ChevronDown className="size-3" />
            </>
          )}
        </Button>
      </div>

      {isVisible && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {statConfig.map((stat) => {
            const isActive =
              stat.id === "active" || stat.id === "inactive"
                ? currentActivity === stat.id
                : currentActivity === "all" && currentStatus === stat.id;
            const Icon = stat.icon;

            return (
              <Card
                key={stat.id}
                className={cn(
                  "cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
                  isActive
                    ? "ring-2 ring-primary"
                    : "opacity-80 shadow-none border-dashed",
                )}
                onClick={() => handleStatusClick(stat.id)}
              >
                <CardContent className="flex flex-col items-center justify-center p-3 text-center">
                  <div className={cn("rounded-full p-1.5 mb-1", stat.color)}>
                    <Icon className="size-3" />
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-tight line-clamp-1">
                    {stat.label}
                  </span>
                  <span className="text-lg font-bold leading-tight">
                    {stat.value}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
