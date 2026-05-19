import { AppSidebar } from "@/app/admin/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/get-session";
import { getSetting } from "@/lib/actions/setting.actions";
import { toSignInPath } from "@/lib/redirects";
import { redirect } from "next/navigation";
import { SiteHeader } from "./site-header";
import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { isAdminRole, isRestaurantRole } from "@/lib/dashboard-access";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const { site } = await getSetting();

  if (!session?.user) {
    redirect(toSignInPath("/admin"));
  }

  if (isRestaurantRole(session.user.role)) {
    redirect("/restaurant-admin/overview");
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/forbidden");
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        siteLogo={site.logo}
        siteName={site.name}
        userRole={session.user.role}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-2">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
