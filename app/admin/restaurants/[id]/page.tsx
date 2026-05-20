import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import RestaurantSettingsForm from "@/app/restaurant-admin/settings/restaurant-settings-form";
import { getRestaurantSettingsByIdForAdmin } from "@/lib/actions/restaurant.actions";

export const metadata: Metadata = {
  title: "Edit Restaurant",
};

type AdminRestaurantEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminRestaurantEditPage(
  props: AdminRestaurantEditPageProps,
) {
  const { id } = await props.params;
  const result = await getRestaurantSettingsByIdForAdmin(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const restaurant = result.data;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <div className="flex text-sm text-muted-foreground">
        <Link href="/admin/restaurants" className="hover:underline">
          Restaurants
        </Link>
        <span className="mx-1">{">"}</span>
        <Link
          href={`/admin/restaurants/${restaurant._id}`}
          className="hover:underline"
        >
          {restaurant.name}
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Restaurant</h1>
        <p className="text-sm text-muted-foreground">
          Owner: {restaurant.ownerName}
          {restaurant.ownerEmail ? ` (${restaurant.ownerEmail})` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              restaurant.status === "approved"
                ? "success"
                : restaurant.status === "pending"
                  ? "pending"
                  : "destructive"
            }
          >
            {restaurant.status.toUpperCase()}
          </Badge>
          <Badge variant={restaurant.isActive ? "success" : "secondary"}>
            {restaurant.isActive ? "ACTIVE" : "SUSPENDED"}
          </Badge>
        </div>
      </div>

      <RestaurantSettingsForm
        restaurant={restaurant}
        adminRestaurantId={restaurant._id}
        submitButtonLabel="Save Restaurant Changes"
      />
    </main>
  );
}
