"use client";

import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import useIsMounted from "@/hooks/use-is-mounted";
import useShowSidebar from "@/hooks/use-cart-sidebar";
import { cn } from "@/lib/utils";
import useCartStore from "@/hooks/use-cart-store";

export default function CartButton() {
  const isMounted = useIsMounted();
  const showSidebar = useShowSidebar();

  const {
    cart: { items },
  } = useCartStore();

  const cartItemsCount = items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const badgeSize = cartItemsCount >= 10 ? "px-0.5 text-[9px]" : "";

  return (
    <Link
      href="/cart"
      className={cn(
        "group header-icon-button",
        showSidebar && "border-border bg-accent text-foreground",
      )}
      aria-label={`Shopping cart, ${cartItemsCount} items`}
      title={`Cart (${cartItemsCount})`}
    >
      <ShoppingCartIcon className="h-5 w-5" aria-hidden="true" />

      <span className="sr-only">Shopping cart with {cartItemsCount} items</span>

      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 md:block">
        Cart ({cartItemsCount})
      </span>

      {isMounted && (
        <span
          className={cn("header-count-badge", badgeSize)}
          aria-hidden="true"
        >
          {cartItemsCount}
        </span>
      )}

      {showSidebar && (
        <span
          className="absolute -right-4 top-4 z-10 h-0 w-0 -rotate-90 border-x-[7px] border-b-8 border-x-transparent border-b-background"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
