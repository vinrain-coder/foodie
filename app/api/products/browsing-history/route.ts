import { NextRequest, NextResponse } from "next/server";
import MenuItem from "@/lib/db/models/menu.item.model";
import Restaurant from "@/lib/db/models/restaurant.model";
import { connectToDatabase } from "@/lib/db";

async function getStorefrontVisibilityFilter() {
  const hiddenRestaurants = await Restaurant.find({
    $or: [
      { status: { $ne: "approved" } },
      { isApproved: false },
      { isActive: false },
    ],
  })
    .select("_id")
    .lean();

  if (hiddenRestaurants.length === 0) return {};

  return {
    $or: [
      { restaurant: { $exists: false } },
      { restaurant: null },
      { restaurant: { $nin: hiddenRestaurants.map((r) => r._id) } },
    ],
  };
}

async function getBrowsingMenuItems(idsKey: string, categoriesKey: string) {
  await connectToDatabase();

  const menuItemIds = idsKey.split(",");
  const categories = categoriesKey.split(",");
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();

  const [history, related] = await Promise.all([
    // Browsing history
    MenuItem.find({ _id: { $in: menuItemIds }, ...storefrontVisibilityFilter }).lean(),

    // Related menuItems (stronger logic)
    MenuItem.find({
      $or: [
        { category: { $in: categories } },
        { isFeatured: true }, // fallback if category is weak
      ],
      _id: { $nin: menuItemIds },
      ...storefrontVisibilityFilter,
    })
      .limit(20)
      .lean(),
  ]);

  return { history, related, menuItemIds };
}

export const GET = async (request: NextRequest) => {
  const type = request.nextUrl.searchParams.get("type") || "both";
  const ids = request.nextUrl.searchParams.get("ids");
  const categories = request.nextUrl.searchParams.get("categories");

  if (!ids || !categories) {
    return NextResponse.json({ history: [], related: [] });
  }

  const { history, related, menuItemIds } = await getBrowsingMenuItems(
    ids,
    categories,
  );

  // ✅ Preserve browsing order correctly
  const orderedHistory = history.sort(
    (a: any, b: any) =>
      menuItemIds.indexOf(a._id.toString()) -
      menuItemIds.indexOf(b._id.toString()),
  );

  if (type === "history") return NextResponse.json(orderedHistory);
  if (type === "related") return NextResponse.json(related);

  return NextResponse.json({
    history: orderedHistory,
    related,
  });
};
