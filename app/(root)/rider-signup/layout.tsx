import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-session";
import { toSignInPath } from "@/lib/redirects";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Rider Registration",
  robots: PRIVATE_ROBOTS,
};

export default async function RiderSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(toSignInPath("/rider-signup"));
  }

  return children;
}
