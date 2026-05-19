"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { authClient } from "@/lib/auth-client";
import { canAccessAdminDashboard, isRestaurantRole } from "@/lib/dashboard-access";
import { cn } from "@/lib/utils";

export function AccountNav() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const canAccessRestaurantDashboard = canAccessAdminDashboard(
    session?.user?.role,
  );
  const restaurantUser = isRestaurantRole(session?.user?.role);
  const accountNavGroups = [
    {
      label: "Account",
      items: [
        {
          href: "/account",
          label: "Overview",
          description: "Your account home",
        },
        {
          href: "/account/orders",
          label: "Orders",
          description: "Track and manage purchases",
        },
        {
          href: "/account/addresses",
          label: "Addresses",
          description: "Manage delivery addresses",
        },
      ],
    },
    {
      label: "Content",
      items: [
        {
          href: "/account/reviews",
          label: "My Reviews",
          description: "View and delete product reviews",
        },
        {
          href: "/account/comments",
          label: "My Comments",
          description: "View and delete blog comments",
        },
      ],
    },
    {
      label: "Restaurant",
      items: canAccessRestaurantDashboard
        ? [
            {
              href: restaurantUser
                ? "/restaurant-admin/overview"
                : "/admin/overview",
              label: restaurantUser
                ? "Restaurant Dashboard"
                : "Admin Dashboard",
              description: "Open dashboard overview",
            },
            {
              href: restaurantUser
                ? "/restaurant-admin/menu-items"
                : "/admin/menu-items",
              label: "Manage Menu Items",
              description: "Create and edit menu items",
            },
            {
              href: restaurantUser ? "/restaurant-admin/orders" : "/admin/orders",
              label: "Manage Orders",
              description: "Process incoming orders",
            },
          ]
        : [
            {
              href: "/restaurant/register",
              label: "Restaurant Application",
              description: "Apply to onboard your restaurant",
            },
          ],
    },
    {
      label: "Settings",
      items: [
        {
          href: "/account/manage",
          label: "Login & Security",
          description: "Update profile, email and password",
        },
      ],
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-3">
      <h2 className="px-2 pb-3 text-sm font-semibold text-muted-foreground">Account navigation</h2>

      <NavigationMenu className="w-full max-w-full">
        <NavigationMenuList className="w-full gap-2">
          {accountNavGroups.map((group) => (
            <NavigationMenuItem key={group.label} className="w-full">
              <NavigationMenuTrigger className="w-full justify-between rounded-lg border px-3 text-left">
                {group.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent className="relative w-full p-0">
                <ul className="grid gap-2 p-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/account" && pathname.startsWith(`${item.href}/`));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "block rounded-md border px-3 py-2 transition-colors hover:bg-accent",
                            isActive && "border-primary bg-primary/10"
                          )}
                        >
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
