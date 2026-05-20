import {
  getRestaurantSettingsForOwner,
} from "@/lib/actions/restaurant.actions";
import RestaurantSettingsForm from "./restaurant-settings-form";
import { redirect } from "next/navigation";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restaurant Settings",
};
const SettingPage = async () => {
  const result = await getRestaurantSettingsForOwner();

  if (!result.success || !result.data) {
    const message = (result.message || "").toLowerCase();
    if (message.includes("profile not found")) {
      redirect("/restaurant/register");
    }
    redirect("/restaurant-admin/overview");
  }

  return (
    <div className="w-full md:px-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="h1-bold text-3xl tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage only your restaurant profile and operational preferences.
          </p>
        </div>

        <div className="pb-24">
          <RestaurantSettingsForm restaurant={result.data} />
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
