import { HelpCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { getSetting } from "@/lib/actions/setting.actions";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { site, common } = await getSetting();

  if (common.isMaintenanceMode) {
    const session = await getServerSession();
    if (session?.user?.role !== "ADMIN") {
      redirect("/maintenance");
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* HEADER */}
      <header className="bg-card border-b shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={site.logo}
              alt="logo"
              width={90}
              height={90}
              className="object-contain"
            />
          </Link>

          {/* Title + trust */}
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Secure Checkout
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Your information is protected</span>
            </div>
          </div>

          {/* Help with tooltip */}
          <div className="relative flex flex-col items-center group">
            <Link
              href="/page/help"
              className="p-2 rounded-full hover:bg-muted transition"
            >
              <HelpCircle className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
            </Link>

            {/* Tooltip BELOW icon */}
            <div className="absolute top-full mt-2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
              <div className="rounded-md bg-black text-white text-xs px-3 py-1 shadow-md whitespace-nowrap">
                Need help?
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
