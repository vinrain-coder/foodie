import { Metadata } from "next";
import { getAdminRestaurantPayouts } from "@/lib/actions/restaurant-finance.actions";
import { getServerSession } from "@/lib/get-session";
import { isAdminRole } from "@/lib/dashboard-access";
import PayoutsAdminClient from "./payouts-admin-client";

export const metadata: Metadata = {
  title: "Restaurant Payouts",
};

export default async function RestaurantPayoutsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await getServerSession();
  if (!isAdminRole(session?.user?.role)) {
    throw new Error("Admin permission required");
  }

  const params = await searchParams;
  const page = Number(params.page || 1);
  const status = params.status || "all";

  const result = await getAdminRestaurantPayouts({ page, status });

  if (!result.success || !result.data) {
    return (
      <div className="space-y-2">
        <h1 className="h1-bold">Restaurant Payouts</h1>
        <p className="text-sm text-destructive">
          {result.message || "Failed to load payouts"}
        </p>
      </div>
    );
  }

  return (
    <PayoutsAdminClient
      initialData={result.data}
      currentPage={page}
      currentStatus={status}
    />
  );
}
