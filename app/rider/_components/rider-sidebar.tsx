"use client";

import * as React from "react";
import {
  IconBike,
  IconUser,
  IconCertificate,
  IconWallet,
  IconReceipt2,
  IconChecklist,
  IconClipboardList,
  IconSettings,
} from "@tabler/icons-react";

import { useSidebar } from "@/components/ui/sidebar";
import { NavDocuments } from "@/app/admin/nav-documents";
import { NavContent } from "@/app/admin/nav-content";
import { NavSecondary } from "@/app/admin/nav-secondary";
import { NavMain } from "@/app/admin/nav-main";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const data = {
  navMain: [
    {
      title: "Delivery Jobs",
      url: "/rider/jobs",
      icon: IconChecklist,
    },
    {
      title: "Job Timelines",
      url: "/rider/timelines",
      icon: IconClipboardList,
    },
  ],
  operations: [
    {
      title: "Profile",
      url: "/rider/profile",
      icon: IconUser,
    },
    {
      title: "Compliance / KYC",
      url: "/rider/kyc",
      icon: IconCertificate,
    },
  ],
  finance: [
    {
      title: "Earnings & Finance",
      url: "/rider/finance",
      icon: IconWallet,
    },
  ],
};

export function RiderSidebar({
  ...props
}: React.ComponentPropsWithoutRef<typeof Sidebar>) {
  const pathname = usePathname();
  const { isMobile, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/rider/jobs" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <IconBike className="h-5 w-5 text-primary" />
                </div>
                <span className="text-base font-semibold">Rider</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={data.navMain}
          createUrl="/rider/jobs"
        />
        <NavDocuments title="Account" items={data.operations} />
        {data.finance.length > 0 && (
          <NavDocuments title="Finance" items={data.finance} />
        )}
        <NavSecondary
          items={[
            { title: "Settings", url: "/rider/settings", icon: IconSettings },
          ]}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          ← Back to marketplace
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
