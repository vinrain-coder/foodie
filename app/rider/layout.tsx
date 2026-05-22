import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/get-session";
import { toSignInPath } from "@/lib/redirects";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { bootstrapRiderProfile } from "@/lib/actions/rider.actions";
import { isRiderRole, canAccessRiderDashboard } from "@/lib/dashboard-access";
import { RiderSidebar } from "./_components/rider-sidebar";

export const metadata: Metadata = {
  title: "Rider Dashboard",
  robots: PRIVATE_ROBOTS,
};

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(toSignInPath("/rider/jobs"));
  }

  if (!canAccessRiderDashboard(session.user.role)) {
    redirect("/forbidden");
  }

  // Only redirect non-rider roles away
  if (!isRiderRole(session.user.role)) {
    redirect("/forbidden");
  }

  await bootstrapRiderProfile();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <RiderSidebar />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-2">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
