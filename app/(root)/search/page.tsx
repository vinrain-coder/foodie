import Pagination from "@/components/shared/pagination";
import {
  getAllMenuItems,
  getAllCategories,
  getAllTags,
} from "@/lib/actions/menu.item.actions";
import FiltersClient from "@/components/shared/search/filters-client";
import Breadcrumb from "@/components/shared/breadcrumb";
import { Metadata } from "next";
import MenuItemSortSelector from "@/components/shared/menuItem/menu-item-sort-selector";
import SearchMenuItemsClient from "@/components/shared/search/search-menu-items-client";

export async function generateMetadata(props: {
  searchParams: Promise<any>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const { q = "all", category = "all" } = searchParams;

  if (q !== "all") {
    return {
      title: `Search results for "${q}"`,
      robots: { index: false, follow: true },
    };
  }
  if (category !== "all") {
    const title =
      category !== "all" &&
      category.charAt(0).toUpperCase() + category.slice(1);
    return {
      title: title,
      robots: { index: false, follow: true },
    };
  }

  return {
    title: "Search",
    robots: { index: false, follow: true },
  };
}

const sortOrders = [
  { value: "price-low-to-high", name: "Price: Low to high" },
  { value: "price-high-to-low", name: "Price: High to low" },
  { value: "newest-arrivals", name: "Newest arrivals" },
  { value: "avg-customer-review", name: "Avg. customer review" },
  { value: "best-selling", name: "Best selling" },
];

export default async function SearchPage(props: {
  searchParams: Promise<any>;
}) {
  const searchParams = await props.searchParams;
  const {
    q = "all",
    category = "all",
    tag = "all",
    price = "all",
    rating = "all",
    sort = "best-selling",
    page = "1",
  } = searchParams;
  const params = {
    q,
    category,
    tag,
    price,
    rating,
    sort,
    page,
  };

  const [categories, tags, data] = await Promise.all([
    getAllCategories(),
    getAllTags(),
    getAllMenuItems({
      category,
      tag,
      query: q,
      price,
      rating,
      sort,
      page: Number(page),
    }),
  ]);

  return (
    <div className="space-y-1 md:space-y-2">
      <Breadcrumb />
      <div className="my-1 rounded-xl bg-card md:border-b md:rounded-none flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-3">
        <div className="text-sm text-muted-foreground">
          {data.totalMenuItems === 0
            ? "No results"
            : `${data.from}-${data.to} of ${data.totalMenuItems}`}{" "}
          results
        </div>

        <div className="w-full md:w-auto md:ml-auto mb-1">
          <MenuItemSortSelector
            sortOrders={sortOrders}
            sort={sort}
            params={params}
            basePath="/search"
          />
        </div>
      </div>

      <div className="bg-card grid md:grid-cols-5 py-1 md:py-2 md:gap-6">
        <FiltersClient
          initialParams={params}
          categories={categories}
          tags={tags}
          basePath="/search"
        />
        <div className="md:col-span-4 space-y-4">
          <SearchMenuItemsClient menuItems={data?.menuItems ?? []} />
          {data.totalPages > 1 && (
            <Pagination page={page} totalPages={data.totalPages} />
          )}
        </div>
      </div>
    </div>
  );
}
