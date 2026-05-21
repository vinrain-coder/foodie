"use client";

import * as React from "react";
import {
  IconCategory,
  IconChecklist,
  IconClipboardList,
  IconCoin,
  IconDashboard,
  IconLayoutGrid,
  IconMapPin,
  IconMessageCircle,
  IconReceipt2,
  IconSettings,
  IconTags,
  IconBellRinging,
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
import { NavDocuments } from "@/app/admin/nav-documents";
import { NavContent } from "@/app/admin/nav-content";

const data = {
  navMain: [
    {
      title: "Overview",
      url: "/restaurant-admin/overview",
      icon: IconDashboard,
    },
  ],
  operations: [
    {
      title: "Menu Items",
      url: "/restaurant-admin/menu-items",
      icon: IconLayoutGrid,
    },
    {
      title: "Orders",
      url: "/restaurant-admin/orders",
      icon: IconReceipt2,
    },
    {
      title: "Finance",
      url: "/restaurant-admin/finance",
      icon: IconCoin,
    },
  ],
  storefront: [
    {
      title: "Restock Alerts",
      url: "/restaurant-admin/stockSubs",
      icon: IconBellRinging,
    },
    {
      title: "Customer Reviews",
      url: "/restaurant-admin/reviews",
      icon: IconChecklist,
    },
    {
      title: "Support Inbox",
      url: "/restaurant-admin/support",
      icon: IconMessageCircle,
    },
  ],
  catalog: [
    {
      title: "Categories",
      url: "/restaurant-admin/categories",
      icon: IconCategory,
    },
    {
      title: "Tags",
      url: "/restaurant-admin/tags",
      icon: IconTags,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/restaurant-admin/settings",
      icon: IconSettings,
    },
  ],
};

export function RestaurantAdminSidebar({
  restaurantLogo,
  restaurantName,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  restaurantLogo: string;
  restaurantName: string;
}) {
  const nameInitial = restaurantName.trim().charAt(0).toUpperCase() || "R";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link
                href="/restaurant-admin/overview"
                className="flex items-center gap-2"
              >
                {restaurantLogo ? (
                  <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded border bg-muted/40">
                    <Image
                      src={restaurantLogo}
                      alt={`${restaurantName} logo`}
                      width={52}
                      height={52}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded bg-primary/10 text-lg font-semibold text-primary">
                    {nameInitial}
                  </div>
                )}
                <span className="text-base font-semibold">
                  {restaurantName}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={data.navMain}
          createUrl="/restaurant-admin/menu-items/create"
        />
        <NavDocuments title="Operations" items={data.operations} />
        <NavDocuments title="Storefront" items={data.storefront} />
        <NavContent title="Catalog" items={data.catalog} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
