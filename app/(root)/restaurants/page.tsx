import type { Metadata } from "next";
import Breadcrumb from "@/components/shared/breadcrumb";
import Pagination from "@/components/shared/pagination";
import RestaurantCard from "./restaurant-card";
import RestaurantsFiltersClient from "./restaurants-filters-client";
import RestaurantsSortSelector from "./restaurants-sort-selector";
import {
  getAllRestaurantsForStorefront,
  getStorefrontRestaurantFilters,
} from "@/lib/actions/restaurant.actions";
import { getSetting } from "@/lib/actions/setting.actions";

export async function generateMetadata(props: {
  searchParams: Promise<any>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const { site } = await getSetting();
  const q = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const normalizedQ = q && q !== "all" ? q : "";

  const title = normalizedQ
    ? `Restaurants matching "${normalizedQ}"`
    : "Restaurants";
  const description = normalizedQ
    ? `Browse restaurants that match "${normalizedQ}" and explore their menu items.`
    : "Discover all restaurants, filter by cuisine and service type, and browse their menu items.";

  return {
    title,
    description,
    alternates: {
      canonical: `${site.url}/restaurants`,
    },
    openGraph: {
      title,
      description,
      url: `${site.url}/restaurants`,
      siteName: site.name,
      type: "website",
    },
  };
}

export default async function RestaurantsPage(props: {
  searchParams: Promise<any>;
}) {
  const searchParams = await props.searchParams;
  const q = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const cuisine = Array.isArray(searchParams.cuisine)
    ? searchParams.cuisine[0]
    : searchParams.cuisine;
  const service = Array.isArray(searchParams.service)
    ? searchParams.service[0]
    : searchParams.service;
  const location = Array.isArray(searchParams.location)
    ? searchParams.location[0]
    : searchParams.location;
  const sort = Array.isArray(searchParams.sort)
    ? searchParams.sort[0]
    : searchParams.sort;
  const page = Array.isArray(searchParams.page)
    ? searchParams.page[0]
    : searchParams.page;

  const normalizedQ = q || "all";
  const normalizedCuisine = cuisine || "all";
  const normalizedService = service || "all";
  const normalizedLocation = location || "all";
  const normalizedSort = sort || "newest";
  const normalizedPage = page || "1";

  const [filterOptions, data] = await Promise.all([
    getStorefrontRestaurantFilters(),
    getAllRestaurantsForStorefront({
      query: normalizedQ,
      cuisine: normalizedCuisine,
      service: normalizedService,
      location: normalizedLocation,
      sort: normalizedSort,
      page: Number(normalizedPage),
    }),
  ]);

  const params = {
    q: normalizedQ,
    cuisine: normalizedCuisine,
    service: normalizedService,
    location: normalizedLocation,
    sort: normalizedSort,
    page: normalizedPage,
  };

  return (
    <div className="space-y-1 md:space-y-2">
      <Breadcrumb />

      <div className="my-1 rounded-xl bg-card md:border-b md:rounded-none flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Restaurants</h1>
          <p className="text-sm text-muted-foreground">
            {data.totalRestaurants === 0
              ? "No restaurants found"
              : `${data.from}-${data.to} of ${data.totalRestaurants}`}{" "}
            restaurants
          </p>
        </div>

        <div className="w-full md:w-auto md:ml-auto mb-1">
          <RestaurantsSortSelector params={params} sort={normalizedSort} />
        </div>
      </div>

      <div className="bg-card grid md:grid-cols-5 py-1 md:py-2 md:gap-6">
        <aside className="hidden md:block md:col-span-1">
          <div className="sticky top-10 h-[calc(100vh-5rem)] overflow-auto rounded-lg border p-4 bg-card">
            <RestaurantsFiltersClient
              initialParams={params}
              cuisines={filterOptions.cuisines}
              locations={filterOptions.locations}
            />
          </div>
        </aside>

        <div className="md:col-span-4 space-y-4">
          <div className="md:hidden rounded-lg border p-3 bg-card">
            <RestaurantsFiltersClient
              initialParams={params}
              cuisines={filterOptions.cuisines}
              locations={filterOptions.locations}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                No restaurants matched your filters.
              </div>
            ) : (
              data.data.map((restaurant) => (
                <RestaurantCard key={restaurant._id} restaurant={restaurant} />
              ))
            )}
          </div>

          {data.totalPages > 1 ? (
            <Pagination page={normalizedPage} totalPages={data.totalPages} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
