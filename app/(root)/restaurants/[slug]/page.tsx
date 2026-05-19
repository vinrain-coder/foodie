import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/shared/breadcrumb";
import Pagination from "@/components/shared/pagination";
import FiltersClient from "@/components/shared/search/filters-client";
import MenuItemSortSelector from "@/components/shared/menuItem/menu-item-sort-selector";
import SearchMenuItemsClient from "@/components/shared/search/search-menu-items-client";
import {
  getRestaurantBySlugForStorefront,
} from "@/lib/actions/restaurant.actions";
import {
  getAllCategoriesForStorefrontRestaurant,
  getAllMenuItems,
  getAllTagsForStorefrontRestaurant,
} from "@/lib/actions/menu.item.actions";
import { getSetting } from "@/lib/actions/setting.actions";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Bike, Clock3, HandPlatter, Mail, MapPin, Phone, UtensilsCrossed } from "lucide-react";

const sortOrders = [
  { value: "price-low-to-high", name: "Price: Low to high" },
  { value: "price-high-to-low", name: "Price: High to low" },
  { value: "newest-arrivals", name: "Newest arrivals" },
  { value: "avg-customer-review", name: "Avg. customer review" },
  { value: "best-selling", name: "Best selling" },
];

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const [restaurant, { site }] = await Promise.all([
    getRestaurantBySlugForStorefront(slug),
    getSetting(),
  ]);

  if (!restaurant) {
    return {
      title: "Restaurant not found",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: restaurant.name,
    description: restaurant.description,
    alternates: {
      canonical: `${site.url}/restaurants/${restaurant.slug}`,
    },
    openGraph: {
      title: restaurant.name,
      description: restaurant.description,
      url: `${site.url}/restaurants/${restaurant.slug}`,
      siteName: site.name,
      images: restaurant.coverImage ? [restaurant.coverImage] : [],
      type: "website",
    },
  };
}

export default async function RestaurantDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<any>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const restaurant = await getRestaurantBySlugForStorefront(slug);
  if (!restaurant) notFound();

  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const category = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const tag = Array.isArray(sp.tag) ? sp.tag[0] : sp.tag;
  const price = Array.isArray(sp.price) ? sp.price[0] : sp.price;
  const rating = Array.isArray(sp.rating) ? sp.rating[0] : sp.rating;
  const sort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const page = Array.isArray(sp.page) ? sp.page[0] : sp.page;

  const normalizedQ = q || "all";
  const normalizedCategory = category || "all";
  const normalizedTag = tag || "all";
  const normalizedPrice = price || "all";
  const normalizedRating = rating || "all";
  const normalizedSort = sort || "best-selling";
  const normalizedPage = page || "1";

  const filterParams = {
    q: normalizedQ,
    category: normalizedCategory,
    tag: normalizedTag,
    price: normalizedPrice,
    rating: normalizedRating,
    sort: normalizedSort,
    page: normalizedPage,
  };

  const [categories, tags, data] = await Promise.all([
    getAllCategoriesForStorefrontRestaurant(restaurant._id),
    getAllTagsForStorefrontRestaurant(restaurant._id),
    getAllMenuItems({
      query: normalizedQ,
      category: normalizedCategory,
      tag: normalizedTag,
      price: normalizedPrice,
      rating: normalizedRating,
      sort: normalizedSort,
      page: Number(normalizedPage),
      restaurantId: restaurant._id,
    }),
  ]);

  return (
    <div className="space-y-2 md:space-y-4">
      <Breadcrumb />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="relative h-40 w-full bg-muted sm:h-52">
          {restaurant.coverImage ? (
            <Image
              src={restaurant.coverImage}
              alt={`${restaurant.name} cover image`}
              fill
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UtensilsCrossed className="h-8 w-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        <div className="space-y-3 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{restaurant.name}</h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {restaurant.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {restaurant.cuisineTypes.map((cuisine) => (
                  <Badge key={cuisine} variant="secondary" className="rounded-full">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <div className="font-semibold">{restaurant.menuItemsCount} menu items</div>
              <div className="text-muted-foreground">
                Minimum order: {formatCurrency(restaurant.minimumOrderAmount)}
              </div>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{restaurant.location}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2">
              <Clock3 className="h-4 w-4" />
              <span className="line-clamp-1">{restaurant.openingHours}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2">
              <Phone className="h-4 w-4" />
              <span>{restaurant.phone}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2">
              <Mail className="h-4 w-4" />
              <span className="line-clamp-1">{restaurant.email || "N/A"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {restaurant.acceptsDelivery ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                <Bike className="h-3.5 w-3.5" />
                Delivery available
              </span>
            ) : null}
            {restaurant.acceptsPickup ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                <HandPlatter className="h-3.5 w-3.5" />
                Pickup available
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
              Avg prep: {restaurant.averagePrepTimeMinutes} mins
            </span>
          </div>
        </div>
      </section>

      <div className="my-1 rounded-xl bg-card md:border-b md:rounded-none flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-3">
        <div className="text-sm text-muted-foreground">
          {data.totalMenuItems === 0
            ? "No products found"
            : `${data.from}-${data.to} of ${data.totalMenuItems}`}{" "}
          products
        </div>

        <div className="w-full md:w-auto md:ml-auto mb-1">
          <MenuItemSortSelector
            sortOrders={sortOrders}
            sort={normalizedSort}
            params={filterParams}
            basePath={`/restaurants/${restaurant.slug}`}
          />
        </div>
      </div>

      <div className="bg-card grid md:grid-cols-5 py-1 md:py-2 md:gap-6">
        <FiltersClient
          initialParams={filterParams}
          categories={categories}
          tags={tags}
          basePath={`/restaurants/${restaurant.slug}`}
        />

        <div className="md:col-span-4 space-y-4">
          <SearchMenuItemsClient menuItems={data?.menuItems ?? []} />
          {data.totalPages > 1 ? (
            <Pagination page={normalizedPage} totalPages={data.totalPages} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
