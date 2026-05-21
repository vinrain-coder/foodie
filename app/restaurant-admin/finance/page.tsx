import { Metadata } from "next";
import { getRestaurantFinanceDashboardData } from "@/lib/actions/restaurant-finance.actions";
import { getServerSession } from "@/lib/get-session";
import { isAdminRole } from "@/lib/dashboard-access";
import { connectToDatabase } from "@/lib/db";
import Restaurant from "@/lib/db/models/restaurant.model";
import { Button } from "@/components/ui/button";
import FinanceClient from "./finance-client";

export const metadata: Metadata = {
  title: "Restaurant Finance",
};

async function getAdminRestaurantOptions() {
  await connectToDatabase();
  const rows = await Restaurant.find({})
    .select("_id name status isActive")
    .sort({ name: 1 })
    .lean();

  return rows.map((row) => ({
    id: row._id.toString(),
    name: row.name,
    status: row.status,
    isActive: !!row.isActive,
  }));
}

function AdminRestaurantSelector({
  selectedRestaurantId,
  options,
}: {
  selectedRestaurantId: string;
  options: Array<{
    id: string;
    name: string;
    status: string;
    isActive: boolean;
  }>;
}) {
  return (
    <form
      action="/restaurant-admin/finance"
      className="mb-4 flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-2">
        <label htmlFor="restaurantId" className="text-sm font-medium">
          Restaurant
        </label>
        <select
          id="restaurantId"
          name="restaurantId"
          defaultValue={selectedRestaurantId}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Select a restaurant</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.status}
              {option.isActive ? ", active" : ", inactive"})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="sm:w-auto">
        Open finance
      </Button>
    </form>
  );
}

export default async function RestaurantFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const session = await getServerSession();
  const adminView = isAdminRole(session?.user?.role);
  const params = await searchParams;
  const selectedRestaurantId = String(params.restaurantId || "").trim();

  const adminOptions = adminView ? await getAdminRestaurantOptions() : [];

  if (adminView && !selectedRestaurantId) {
    return (
      <div className="space-y-3">
        <h1 className="h1-bold">Finance</h1>
        <p className="text-sm text-muted-foreground">
          Select a restaurant to view finance details.
        </p>
        <AdminRestaurantSelector
          selectedRestaurantId=""
          options={adminOptions}
        />
      </div>
    );
  }

  const result = await getRestaurantFinanceDashboardData(
    adminView ? { restaurantId: selectedRestaurantId } : undefined,
  );

  if (!result.success || !result.data) {
    return (
      <div className="space-y-3">
        <h1 className="h1-bold">Finance</h1>
        {adminView ? (
          <AdminRestaurantSelector
            selectedRestaurantId={selectedRestaurantId}
            options={adminOptions}
          />
        ) : null}
        <p className="text-sm text-destructive">
          {result.message || "Failed to load finance dashboard"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {adminView ? (
        <AdminRestaurantSelector
          selectedRestaurantId={selectedRestaurantId}
          options={adminOptions}
        />
      ) : null}
      <FinanceClient initialData={result.data} readOnly={adminView} />
    </div>
  );
}
