import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/get-session";
import { toSignInPath } from "@/lib/redirects";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { bootstrapRiderProfile } from "@/lib/actions/rider.actions";
import { canStartRiderOnboarding } from "@/lib/dashboard-access";
import { RiderSidebar } from "./_components/rider-sidebar";
import RiderTopbar from "./_components/rider-topbar";

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

  if (!canStartRiderOnboarding(session.user.role)) {
    redirect("/forbidden");
  }

  await bootstrapRiderProfile();

  return (
    <SidebarProvider
      className="bg-muted/30"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <RiderSidebar />
      <SidebarInset className="min-h-svh bg-linear-to-b from-background to-muted/25">
        <RiderTopbar />
        <div className="@container/main flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-4 md:px-6 md:py-6">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
