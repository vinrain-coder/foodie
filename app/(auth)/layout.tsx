import { getSetting } from "@/lib/actions/setting.actions";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import PremiumAuthLayoutClient from "./auth-layout-client";
import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (session?.user) redirect("/");

  const setting = await getSetting();
  const site = setting.site;

  return (
    <PremiumAuthLayoutClient
      site={{
        name: site.name,
        logo: site.logo,
        copyright: site.copyright,
        slogan: site.slogan,
      }}
    >
      {children}
    </PremiumAuthLayoutClient>
  );
}
