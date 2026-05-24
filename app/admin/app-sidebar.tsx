"use client";

import * as React from "react";
import {
  IconArticle,
  IconBellRinging,
  IconCategory,
  IconChecklist,
  IconClipboardList,
  IconDashboard,
  IconFileText,
  IconLayoutGrid,
  IconMail,
  IconReceipt2,
  IconTags,
  IconSettings,
  IconTicket,
  IconUsers,
  IconMessageCircle,
  IconAffiliate,
  IconCash,
  IconMapPin,
  IconCoin,
  IconWallet,
  IconUser,
} from "@tabler/icons-react";

import { NavMain } from "@/app/admin/nav-main";
import { NavSecondary } from "@/app/admin/nav-secondary";
import { NavUser } from "@/app/admin/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { NavDocuments } from "./nav-documents";
import { NavContent } from "./nav-content";
import type { UserRole } from "@/lib/constants";
import { isRestaurantRole } from "@/lib/dashboard-access";

const data = {
  navMain: [
    {
      title: "Overview",
      url: "/admin/overview",
      icon: IconDashboard,
    },
  ],
  operations: [
    {
      title: "Menu Items",
      url: "/admin/menu-items",
      icon: IconLayoutGrid,
    },
    {
      title: "Orders",
      url: "/admin/orders",
      icon: IconReceipt2,
    },
    {
      title: "Coupons",
      url: "/admin/coupons",
      icon: IconTicket,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: IconUsers,
    },
    {
      title: "Restaurants",
      url: "/admin/restaurants",
      icon: IconMapPin,
    },
    {
      title: "Riders",
      url: "/admin/riders",
      icon: IconUser,
    },
    {
      title: "Rider Dispatch",
      url: "/admin/rider-dispatch",
      icon: IconChecklist,
    },
  ],
  finance: [
    {
      title: "Affiliates",
      url: "/admin/affiliates",
      icon: IconAffiliate,
    },
    {
      title: "Affiliate Competitions",
      url: "/admin/affiliates/competitions",
      icon: IconAffiliate,
    },
    {
      title: "Payouts",
      url: "/admin/payouts",
      icon: IconCash,
    },
    {
      title: "Coins",
      url: "/admin/coins",
      icon: IconCoin,
    },
    {
      title: "Wallet",
      url: "/admin/wallet",
      icon: IconWallet,
    },
    {
      title: "Restaurant Payouts",
      url: "/admin/restaurant-payouts",
      icon: IconCash,
    },
  ],
  storefront: [
    {
      title: "Site Pages",
      url: "/admin/web-pages",
      icon: IconFileText,
    },
    {
      title: "Blog Posts",
      url: "/admin/blogs",
      icon: IconArticle,
    },
    {
      title: "Restock Alerts",
      url: "/admin/stockSubs",
      icon: IconBellRinging,
    },
    {
      title: "Customer Reviews",
      url: "/admin/reviews",
      icon: IconChecklist,
    },
    {
      title: "Support Inbox",
      url: "/admin/support",
      icon: IconMessageCircle,
    },
    {
      title: "Newsletters",
      url: "/admin/newsletters",
      icon: IconMail,
    },
  ],
  catalog: [
    {
      title: "Categories",
      url: "/admin/categories",
      icon: IconCategory,
    },
    {
      title: "Tags",
      url: "/admin/tags",
      icon: IconTags,
    },
  ],
  navSecondary: [
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: IconClipboardList,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: IconSettings,
    },
  ],
};

export function AppSidebar({
  siteLogo,
  siteName,
  userRole,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  siteLogo: string;
  siteName: string;
  userRole: UserRole;
}) {
  const restaurant = isRestaurantRole(userRole);
  const operations = restaurant
    ? data.operations.filter(
        (item) => !["Coupons", "Users", "Restaurants", "Riders"].includes(item.title),
      )
    : data.operations;
  const finance = restaurant ? [] : data.finance;
  const storefront = restaurant
    ? data.storefront.filter(
        (item) =>
          !["Site Pages", "Blog Posts", "Newsletters"].includes(item.title),
      )
    : data.storefront;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src={siteLogo || "/icons/logo.svg"}
                  alt={`${siteName} logo`}
                  width={52}
                  height={52}
                  className="rounded"
                />
                <span className="text-base font-semibold">{siteName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} createUrl="/admin/menu-items/create" />
        {operations.length > 0 && (
          <NavDocuments title="Operations" items={operations} />
        )}
        {finance.length > 0 && <NavDocuments title="Finance" items={finance} />}
        {storefront.length > 0 && (
          <NavDocuments title="Storefront" items={storefront} />
        )}
        <NavContent title="Catalog" items={data.catalog} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
