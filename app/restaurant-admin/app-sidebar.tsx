"use client";

import * as React from "react";
import {
  IconCategory,
  IconChecklist,
  IconClipboardList,
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
      title: "Delivery Locations",
      url: "/restaurant-admin/delivery-locations",
      icon: IconMapPin,
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
      title: "Analytics",
      url: "/restaurant-admin/analytics",
      icon: IconClipboardList,
    },
    {
      title: "Settings",
      url: "/restaurant-admin/settings",
      icon: IconSettings,
    },
  ],
};

export function RestaurantAdminSidebar({
  siteLogo,
  siteName,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  siteLogo: string;
  siteName: string;
}) {
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
