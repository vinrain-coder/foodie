"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect } from "react";

import { getWishlistCount } from "@/lib/actions/wishlist.actions";
import { useSession } from "@/lib/auth-client";
import { useWishlistStore } from "@/hooks/useWishlistStore";

export default function NavbarWishlist() {
  const { data: session } = useSession();
  const { count, setCount } = useWishlistStore();

  useEffect(() => {
    if (!session) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const wishlistCount = await getWishlistCount();
        setCount(wishlistCount);
      } catch {
        setCount(0);
      }
    };

    fetchCount();
  }, [session, setCount]);

  return (
    <Link
      href="/account/wishlist"
      className="group header-icon-button"
      aria-label={`Wishlist, ${count} items`}
      title={`Wishlist (${count})`}
    >
      <Heart className="h-5 w-5" />

      <span className="sr-only">Wishlist with {count} items</span>

      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 md:block">
        Wishlist ({count})
      </span>

      <span className="header-count-badge" aria-hidden="true">
        {count}
      </span>
    </Link>
  );
}
