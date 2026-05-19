import { Metadata } from "next";
import {
  getAllCategories,
  getAllMenuItemsForAdmin,
  getAllTags,
  getMenuItemAdminStats,
} from "@/lib/actions/menu.item.actions";
import MenuItemStatsCards from "./menu-item-stats-cards";
import MenuItemFilters from "./menu-item-filters";
import { MenuItemsDateRangePicker } from "./date-range-picker";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import MenuItemList from "./menu-item-list";

export const metadata: Metadata = {
  title: "Admin Menu Items",
};

export default async function AdminMenuItemsPage(props: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    category?: string;
    tag?: string;
    isPublished?: string;
    from?: string;
    to?: string;
    sort?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const {
    page = "1",
    query = "",
    category = "all",
    tag = "all",
    isPublished = "all",
    from,
    to,
    sort = "latest",
  } = searchParams;

  const [data, stats, categories, tags] = await Promise.all([
    getAllMenuItemsForAdmin({
      query,
      page: Number(page),
      category,
      tag,
      isPublished,
      from,
      to,
      sort,
    }),
    getMenuItemAdminStats({
      query,
      category,
      tag,
      from,
      to,
    }),
    getAllCategories(),
    getAllTags(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="h1-bold">Menu Items</h1>
          <p className="text-muted-foreground">
            Manage your inventory, pricing and stock levels
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <MenuItemsDateRangePicker />
          <Button asChild>
            <Link href="/admin/menu-item/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Menu Item
            </Link>
          </Button>
        </div>
      </div>

      <MenuItemStatsCards stats={stats} currentStatus={isPublished} />

      <div className="rounded-md border bg-card p-4">
        <MenuItemFilters categories={categories} tags={tags} />
      </div>

      <MenuItemList data={data} page={Number(page)} />
    </div>
  );
}
