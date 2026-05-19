"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { useCompareStore } from "@/hooks/useCompareStore";

export default function NavbarCompare() {
  const { count } = useCompareStore();

  return (
    <Link
      href="/compare"
      className="group header-icon-button"
      aria-label={`Compare products, ${count} items`}
      title={`Compare (${count})`}
    >
      <ArrowLeftRight className="h-5 w-5" />

      <span className="sr-only">Compare menu items with {count} items</span>

      <span className="header-count-badge" aria-hidden="true">
        {count}
      </span>

      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 md:block">
        Compare ({count})
      </span>
    </Link>
  );
}
