import { RestaurantAdminSidebar } from "@/app/restaurant-admin/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/get-session";
import { getSetting } from "@/lib/actions/setting.actions";
import { toSignInPath } from "@/lib/redirects";
import { redirect } from "next/navigation";
import { SiteHeader } from "./site-header";
import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { isRestaurantRole } from "@/lib/dashboard-access";
import { getStaffScope } from "@/lib/staff-scope";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default async function RestaurantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const { site } = await getSetting();

  if (!session?.user) {
    redirect(toSignInPath("/restaurant-admin"));
  }

  if (!isRestaurantRole(session.user.role)) {
    redirect("/forbidden");
  }

  try {
    const scope = await getStaffScope();
    if (scope.role !== "RESTAURANT") {
      redirect("/forbidden");
    }
  } catch {
    redirect("/restaurant/register");
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
      <RestaurantAdminSidebar
        variant="inset"
        siteLogo={site.logo}
        siteName={site.name}
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
