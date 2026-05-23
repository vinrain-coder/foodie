"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBike, IconChecklist, IconUser } from "@tabler/icons-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import RiderNav from "../rider-nav";

const TITLES: Array<{ match: string; title: string; subtitle: string }> = [
  {
    match: "/rider/jobs",
    title: "Dispatch Jobs",
    subtitle: "Accept, complete, and track active deliveries.",
  },
  {
    match: "/rider/timelines",
    title: "Dispatch Timeline",
    subtitle: "Audit dispatch events, proofs, and job history.",
  },
  {
    match: "/rider/profile",
    title: "Rider Profile",
    subtitle: "Manage rider identity and account details.",
  },
  {
    match: "/rider/kyc",
    title: "Compliance Center",
    subtitle: "Monitor document verification and KYC status.",
  },
  {
    match: "/rider/finance",
    title: "Earnings Center",
    subtitle: "Track payouts, balances, and finance activity.",
  },
  {
    match: "/rider/settings",
    title: "Account Settings",
    subtitle: "Adjust account and notification preferences.",
  },
];

function resolveTitle(pathname: string) {
  const found = TITLES.find(
    (item) => pathname === item.match || pathname.startsWith(`${item.match}/`),
  );
  return (
    found || {
      title: "Rider Workspace",
      subtitle: "Delivery operations dashboard",
    }
  );
}

export default function RiderTopbar() {
  const pathname = usePathname();
  const current = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto w-full max-w-7xl px-3 py-3 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8" />
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconBike className="h-4 w-4" />
              </span>
              <h2 className="truncate text-sm font-semibold md:text-base">
                {current.title}
              </h2>
            </div>
            <p className="mt-1 hidden text-xs text-muted-foreground md:block">
              {current.subtitle}
            </p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild size="sm" variant="outline">
              <Link href="/rider/profile">
                <IconUser className="mr-1.5 h-4 w-4" />
                Profile
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/rider/jobs">
                <IconChecklist className="mr-1.5 h-4 w-4" />
                Open Jobs
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <RiderNav />
        </div>
      </div>
    </header>
  );
}
