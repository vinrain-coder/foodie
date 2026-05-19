import { Metadata } from "next";
import { getAllMenuItems } from "@/lib/actions/menu.item.actions";
import Breadcrumb from "@/components/shared/breadcrumb";
import MenuItemSortSelector from "@/components/shared/menuItem/menu-item-sort-selector";
import Pagination from "@/components/shared/pagination";
import ShopClient from "./shop-client";

export async function generateMetadata(props: {
  searchParams: Promise<any>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const rawCoupon = searchParams.coupon;
  const couponCode = Array.isArray(rawCoupon) ? rawCoupon[0] : rawCoupon;

  if (couponCode) {
    return {
      title: `Shop with Coupon: ${couponCode}`,
      description: `Use coupon code ${couponCode} for exclusive discounts on our menu items.`,
    };
  }

  return {
    title: "Shop",
    description: "Browse our collection of quality menu items.",
  };
}

const sortOrders = [
  { value: "price-low-to-high", name: "Price: Low to high" },
  { value: "price-high-to-low", name: "Price: High to low" },
  { value: "newest-arrivals", name: "Newest arrivals" },
  { value: "avg-customer-review", name: "Avg. customer review" },
  { value: "best-selling", name: "Best selling" },
];

export default async function ShopPage(props: { searchParams: Promise<any> }) {
  const searchParams = await props.searchParams;
  const { sort = "best-selling", page = "1", coupon } = searchParams;

  // Normalize coupon to a single string (take first if array)
  const normalizedCoupon = Array.isArray(coupon) ? coupon[0] : coupon;

  const params = {
    sort,
    page,
    ...(normalizedCoupon && { coupon: normalizedCoupon }),
  };

  const [data] = await Promise.all([
    getAllMenuItems({
      query: "all",
      category: "all",
      tag: "all",
      price: "all",
      rating: "all",
      sort,
      page: Number(page),
    }),
  ]);

  return (
    <div className="space-y-1 md:space-y-2">
      <Breadcrumb />
      <div className="flex items-center justify-between my-4">
        <h1 className="text-2xl font-bold">Shop</h1>
        <div className="w-full md:w-auto md:ml-auto mb-1">
          <MenuItemSortSelector
            sortOrders={sortOrders}
            sort={sort}
            params={params}
            basePath="/shop"
          />
        </div>
      </div>

      {/* Coupon Banner */}
      {normalizedCoupon && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-center">
          <p className="text-sm font-medium text-primary">
            Coupon code: <span className="font-bold">{normalizedCoupon}</span>{" "}
            will be applied at checkout
          </p>
        </div>
      )}

      <div className="bg-card">
        <ShopClient menuItems={data?.menuItems ?? []} />
      </div>

      {data.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination page={page} totalPages={data.totalPages} />
        </div>
      )}
    </div>
  );
}
