import { RestaurantAdminSidebar } from "@/app/restaurant-admin/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/get-session";
import { toSignInPath } from "@/lib/redirects";
import { redirect } from "next/navigation";
import { SiteHeader } from "./site-header";
import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { canAccessRestaurantDashboard } from "@/lib/dashboard-access";
import { getStaffScope, type StaffScope } from "@/lib/staff-scope";
import Restaurant from "@/lib/db/models/restaurant.model";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default async function RestaurantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect(toSignInPath("/restaurant-admin"));
  }

  if (!canAccessRestaurantDashboard(session.user.role)) {
    redirect("/forbidden");
  }

  let scope: StaffScope;
  try {
    scope = await getStaffScope();
  } catch {
    redirect("/restaurant/register");
  }

  let restaurantName = "Restaurant Dashboard";
  let restaurantLogo = "";

  let restaurant =
    scope.role === "RESTAURANT"
      ? await Restaurant.findById(scope.restaurantId).select("name logo").lean()
      : null;

  if (!restaurant) {
    // Fallback for mixed roles or ownership edge-cases: resolve by owner id.
    restaurant = await Restaurant.findOne({ ownerId: session.user.id })
      .select("name logo")
      .lean();
  }

  if (restaurant) {
    restaurantName = restaurant.name;
    restaurantLogo = restaurant.logo || "";
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
        restaurantLogo={restaurantLogo}
        restaurantName={restaurantName}
      />
      <SidebarInset>
        <SiteHeader
          restaurantName={restaurantName}
          restaurantLogo={restaurantLogo}
        />
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
