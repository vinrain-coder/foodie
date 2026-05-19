import {
  getAllRestaurantApplications,
  getRestaurantApplicationAdminStats,
} from "@/lib/actions/restaurant.actions";
import RestaurantApplicationsList from "./restaurants-list";
import RestaurantApplicationStatusCards from "./status-cards";
import RestaurantApplicationFilters from "./restaurant-filters";
import { RestaurantApplicationsDateRangePicker } from "./date-range-picker";

export default async function RestaurantsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    query?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { page = "1", status = "all", query, from, to } = await searchParams;

  const [applicationsData, statsData] = await Promise.all([
    getAllRestaurantApplications({
      page: Number(page),
      status: status as "all" | "pending" | "approved" | "rejected",
      query,
      from,
      to,
    }),
    getRestaurantApplicationAdminStats({ from, to }),
  ]);

  if (!applicationsData.success || !statsData.success) {
    return (
      <div className="w-full space-y-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
          <h2 className="text-lg font-bold">
            Failed to load restaurant applications
          </h2>
          <ul className="mt-2 list-inside list-disc text-sm">
            {!applicationsData.success && (
              <li>Applications: {applicationsData.message}</li>
            )}
            {!statsData.success && <li>Stats: {statsData.message}</li>}
          </ul>
        </div>
      </div>
    );
  }

  const stats = statsData.data ?? {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  };
  const applications = applicationsData.data ?? [];
  const totalPages = applicationsData.totalPages ?? 1;
  const totalApplications =
    applicationsData.totalApplications ?? applications.length;

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manage Restaurants
          </h1>
          <p className="text-muted-foreground">
            Review restaurant applications and approve or reject onboarding
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RestaurantApplicationFilters />
          <RestaurantApplicationsDateRangePicker />
        </div>
      </div>

      <RestaurantApplicationStatusCards
        stats={stats}
        currentStatus={status}
      />

      <RestaurantApplicationsList
        applications={applications}
        totalPages={totalPages}
        currentPage={Number(page)}
        totalApplications={totalApplications}
      />
    </div>
  );
}
