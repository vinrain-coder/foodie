"use client";

import { useEffect, useMemo, useState } from "react";
import useBrowsingHistory from "@/hooks/use-browsing-history";
import MenuItemSlider from "./menuItem/menu-item-slider";
import { Separator } from "../ui/separator";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Client-side memory cache
const requestCache = new Map<string, any>();

export default function BrowsingHistoryList({
  className,
}: {
  className?: string;
}) {
  const { menuItems } = useBrowsingHistory();

  // Memoized values
  const ids = useMemo(
    () =>
      menuItems
        .map((p) => p.id)
        .filter(Boolean)
        .join(","),
    [menuItems],
  );

  const categories = useMemo(
    () =>
      [...new Set(menuItems.map((p) => p.category).filter(Boolean))].join(","),
    [menuItems],
  );

  const [data, setData] = useState<{
    history: any[];
    related: any[];
  } | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ids) {
      setLoading(false);
      return;
    }

    const cacheKey = `browsing-${ids}-${categories}`;

    if (requestCache.has(cacheKey)) {
      setData(requestCache.get(cacheKey));
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          type: "both",
          ids,
          categories,
        });

        const res = await fetch(
          `/api/menuItems/browsing-history?${query.toString()}`,
        );

        if (!res.ok) throw new Error("Request failed");

        const result = await res.json();
        if (!mounted) return;

        requestCache.set(cacheKey, result);
        setData(result);
      } catch (err) {
        console.error("Browsing history fetch failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [ids, categories]);

  if (!menuItems.length) return null;

  const relatedMenuItems = data?.related ?? [];
  const historyMenuItems = data?.history ?? [];

  const showRelated = relatedMenuItems.length > 0;
  const showHistory = historyMenuItems.length > 0;

  return (
    <div className="bg-background">
      {/* RELATED SECTION */}
      {showRelated && (
        <>
          <div className="flex justify-between items-center px-1 mt-4 gap-4">
            <h2 className="h2-bold leading-tight">
              Related to items you&apos;ve viewed
            </h2>
          </div>
          <Separator className={cn("mb-4", className)} />
          <MenuItemSection
            showTitle={false}
            menuItems={relatedMenuItems}
            loading={loading}
          />
        </>
      )}

      {/* HISTORY SECTION */}
      {showHistory && (
        <>
          <Separator className="mb-4" />

          <div className="flex items-center justify-between mb-3">
            <h2 className="h2-bold">Your browsing history</h2>

            <Link
              href="/browsing-history"
              className="text-md text-blue-600 hover:underline whitespace-nowrap"
            >
              View or edit
            </Link>
          </div>

          <MenuItemSection
            menuItems={historyMenuItems}
            hideDetails
            loading={loading}
          />
        </>
      )}
    </div>
  );
}

function MenuItemSection({
  title,
  menuItems,
  loading,
  hideDetails = false,
  showTitle = true,
}: {
  title?: string;
  menuItems: any[];
  loading: boolean;
  hideDetails?: boolean;
  showTitle?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto py-4 px-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-1/2 sm:w-40 md:w-48 lg:w-56 h-60 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!menuItems.length) return null;

  return (
    <MenuItemSlider
      title={title}
      menuItems={menuItems}
      hideDetails={hideDetails}
      showTitle={showTitle}
    />
  );
}
