"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconChecklist,
  IconClipboardList,
  IconUser,
  IconCertificate,
  IconWallet,
  IconSettings,
} from "@tabler/icons-react";

const ITEMS = [
  { label: "Jobs", href: "/rider/jobs", icon: IconChecklist },
  { label: "Timelines", href: "/rider/timelines", icon: IconClipboardList },
  { label: "Profile", href: "/rider/profile", icon: IconUser },
  { label: "KYC", href: "/rider/kyc", icon: IconCertificate },
  { label: "Finance", href: "/rider/finance", icon: IconWallet },
  { label: "Settings", href: "/rider/settings", icon: IconSettings },
];

export default function RiderNav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-2xl border border-border/70 bg-card/70 p-1.5 backdrop-blur">
      <ul className="flex flex-wrap gap-1">
        {ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
