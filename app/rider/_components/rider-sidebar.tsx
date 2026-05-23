"use client";

import * as React from "react";
import {
  IconBike,
  IconHome2,
  IconUser,
  IconCertificate,
  IconWallet,
  IconChecklist,
  IconClipboardList,
  IconSettings,
} from "@tabler/icons-react";

import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const data = {
  dispatch: [
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
  account: [
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
    {
      title: "Earnings & Finance",
      url: "/rider/finance",
      icon: IconWallet,
    },
    {
      title: "Settings",
      url: "/rider/settings",
      icon: IconSettings,
    },
  ],
};

export function RiderSidebar({
  ...props
}: React.ComponentPropsWithoutRef<typeof Sidebar>) {
  const pathname = usePathname();
  const { isMobile, toggleSidebar } = useSidebar();

  const menuGroups = [
    { title: "Dispatch", items: data.dispatch },
    { title: "Account", items: data.account },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/20 p-2.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                className="data-[slot=sidebar-menu-button]:p-0"
              >
                <Link href="/rider" className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <IconBike className="h-5 w-5" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Rider Console</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Fleet operations
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url || pathname.startsWith(`${item.url}/`);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                        className={cn(
                          "transition-colors",
                          isActive &&
                            "bg-primary/12 text-primary ring-1 ring-primary/25",
                        )}
                      >
                        <Link
                          href={item.url}
                          className="flex items-center gap-2"
                          onClick={() => {
                            if (isMobile) toggleSidebar();
                          }}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to marketplace">
              <Link href="/" className="flex items-center gap-2 text-xs">
                <IconHome2 className="h-4 w-4" />
                <span>Back to marketplace</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
