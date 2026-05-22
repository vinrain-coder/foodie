"use client";

import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "../sign-out-button";
import { authClient } from "@/lib/auth-client";
import {
  canAccessAdminDashboard,
  isRestaurantRole,
  isRiderRole,
} from "@/lib/dashboard-access";

export default function UserButton() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center">
        <div className="header-button flex min-h-10 items-center rounded-lg">
          <div className="hidden flex-col text-xs text-left sm:flex">
            <span>Hello, Sign in</span>
            <span className="font-bold">Account & Orders</span>
          </div>
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      </div>
    );
  }

  const isAffiliate = session?.user?.isAffiliate;
  const canAccessRestaurantDashboard = canAccessAdminDashboard(
    session?.user?.role,
  );
  const restaurantUser = isRestaurantRole(session?.user?.role);
  const riderUser = isRiderRole(session?.user?.role);

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer" asChild>
          <button type="button" className="header-button min-h-10 rounded-lg">
            <div className="hidden flex-col text-left text-xs sm:flex">
              <span>Hello, {session?.user?.name ?? "Guest"}</span>
              <span className="font-bold">Account & Orders</span>
            </div>
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>

        {session ? (
          <DropdownMenuContent className="w-64 p-1.5" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session.user.name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuGroup>
              <Link href="/account" className="w-full">
                <DropdownMenuItem className="cursor-pointer rounded-md">
                  Account
                </DropdownMenuItem>
              </Link>

              <Link href="/account/orders" className="w-full">
                <DropdownMenuItem className="cursor-pointer rounded-md">
                  Orders
                </DropdownMenuItem>
              </Link>

              <Link href="/account/wishlist" className="w-full">
                <DropdownMenuItem className="cursor-pointer rounded-md">
                  Wishlist
                </DropdownMenuItem>
              </Link>

              <Link href="/coupons" className="w-full">
                <DropdownMenuItem className="cursor-pointer rounded-md">
                  Coupons
                </DropdownMenuItem>
              </Link>

              <Link href="/account/wallet" className="w-full">
                <DropdownMenuItem className="cursor-pointer rounded-md">
                  Wallet
                </DropdownMenuItem>
              </Link>

              <Link href="/account/coins" className="w-full">
                <DropdownMenuItem className="cursor-pointer rounded-md">
                  Coins
                </DropdownMenuItem>
              </Link>

              <Link href="/browsing-history" className="w-full">
                <DropdownMenuItem className="cursor-pointer rounded-md">
                  Browsing History
                </DropdownMenuItem>
              </Link>

              {canAccessRestaurantDashboard ? (
                <>
                  <Link
                    href={
                      restaurantUser
                        ? "/restaurant-admin/overview"
                        : "/admin/overview"
                    }
                    className="w-full cursor-pointer"
                  >
                    <DropdownMenuItem className="cursor-pointer rounded-md">
                      {restaurantUser ? "Restaurant Dashboard" : "Admin Dashboard"}
                    </DropdownMenuItem>
                  </Link>
                  <Link
                    href={
                      restaurantUser
                        ? "/restaurant-admin/menu-items"
                        : "/admin/menu-items"
                    }
                    className="w-full cursor-pointer"
                  >
                    <DropdownMenuItem className="cursor-pointer rounded-md">
                      Manage Menu Items
                    </DropdownMenuItem>
                  </Link>
                  <Link
                    href={
                      restaurantUser
                        ? "/restaurant-admin/orders"
                        : "/admin/orders"
                    }
                    className="w-full cursor-pointer"
                  >
                    <DropdownMenuItem className="cursor-pointer rounded-md">
                      Manage Orders
                    </DropdownMenuItem>
                  </Link>
                </>
              ) : (
                <Link href="/restaurant/register" className="w-full cursor-pointer">
                  <DropdownMenuItem className="cursor-pointer rounded-md">
                    Restaurant Application
                  </DropdownMenuItem>
                </Link>
              )}

              {isAffiliate && (
                <Link href="/affiliate/dashboard" className="w-full">
                  <DropdownMenuItem className="cursor-pointer rounded-md">
                    Affiliate Dashboard
                  </DropdownMenuItem>
                </Link>
              )}

              {riderUser && (
                <Link href="/rider/jobs" className="w-full">
                  <DropdownMenuItem className="cursor-pointer rounded-md">
                    Rider Dashboard
                  </DropdownMenuItem>
                </Link>
              )}
            </DropdownMenuGroup>

            <DropdownMenuItem className="p-0 mb-1">
              <SignOutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        ) : (
          <DropdownMenuContent className="w-56 p-1.5" align="end" forceMount>
            <DropdownMenuGroup>
              <DropdownMenuItem className="rounded-md">
                <Link
                  className={cn(buttonVariants(), "w-full")}
                  href="/sign-in"
                >
                  Sign in
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuLabel>
              <div className="font-normal">
                New Customer? <Link href="/sign-up">Sign up</Link>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="rounded-md">
              <Link href="/coupons" className="flex items-center gap-2 w-full">
                <span>Free Coupons</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  );
}
