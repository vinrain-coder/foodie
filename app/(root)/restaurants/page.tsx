import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/shared/breadcrumb";
import Pagination from "@/components/shared/pagination";
import RestaurantsFiltersClient from "./restaurants-filters-client";
import RestaurantsSortSelector from "./restaurants-sort-selector";
import RestaurantCard from "./restaurant-card";
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
    <div className="space-y-4 md:space-y-6">
      <Breadcrumb />

      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-amber-50 via-background to-orange-50 px-5 py-7 shadow-sm md:px-8 md:py-10 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20">
        <div className="relative z-10 max-w-3xl space-y-4">
          <p className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Local Restaurant Directory
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Discover Restaurants Near You
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Explore verified restaurants, compare delivery and pickup options,
            and jump straight to their menu items.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/restaurants"
              className="rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Browse All
            </Link>
            <Link
              href="/restaurants?service=delivery"
              className="rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Delivery Restaurants
            </Link>
            <Link
              href="/restaurants?service=pickup"
              className="rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Pickup Spots
            </Link>
            <Link
              href="/restaurant/register"
              className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Register Your Restaurant
            </Link>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-border/60 bg-card/70 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Restaurants</h2>
            <p className="text-sm text-muted-foreground">
              {data.totalRestaurants === 0
                ? "No restaurants found"
                : `${data.from}-${data.to} of ${data.totalRestaurants}`}{" "}
              restaurants
            </p>
          </div>

          <div className="w-full md:w-auto">
            <RestaurantsSortSelector params={params} sort={normalizedSort} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-5 md:gap-6">
        <aside className="hidden md:block md:col-span-1">
          <div className="sticky top-10 h-[calc(100vh-5rem)] overflow-auto rounded-2xl border border-border/60 bg-card/80 p-4">
            <RestaurantsFiltersClient
              initialParams={params}
              cuisines={filterOptions.cuisines}
              locations={filterOptions.locations}
            />
          </div>
        </aside>

        <div className="md:col-span-4 space-y-4">
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground md:p-4 md:text-sm">
            Explore by service:
            <span className="ml-1">
              <Link href="/restaurants?service=delivery" className="underline underline-offset-4 hover:text-foreground">
                Delivery
              </Link>
            </span>
            <span className="mx-1">|</span>
            <span>
              <Link href="/restaurants?service=pickup" className="underline underline-offset-4 hover:text-foreground">
                Pickup
              </Link>
            </span>
            {filterOptions.cuisines.length > 0 ? (
              <>
                <span className="mx-1">|</span>
                <span>
                  <Link
                    href={`/restaurants?cuisine=${encodeURIComponent(filterOptions.cuisines[0])}`}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {filterOptions.cuisines[0]}
                  </Link>
                </span>
              </>
            ) : null}
          </div>

          <div className="md:hidden rounded-2xl border border-border/60 bg-card p-3">
            <RestaurantsFiltersClient
              initialParams={params}
              cuisines={filterOptions.cuisines}
              locations={filterOptions.locations}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.data.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border/70 p-8 text-center text-muted-foreground">
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
