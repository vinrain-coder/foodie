"use server";

import { connectToDatabase } from "@/lib/db";
import MenuItem, { IMenuItem } from "@/lib/db/models/menu.item.model";
import Order from "@/lib/db/models/order.model";
import { cacheTag, revalidatePath, updateTag, cacheLife } from "next/cache";
import { formatError, escapeRegExp, flattenZodErrors } from "../utils";
import { IMenuItemInput } from "@/types";
import { ActionState } from "@/types/action-state";
import { z } from "zod";
import { getSetting } from "./setting.actions";
import mongoose from "mongoose";
import { UTApi } from "uploadthing/server";
import { notFound } from "next/navigation";
import { MenuItemInputSchema, MenuItemUpdateSchema } from "../validator";
import { getStaffScope } from "@/lib/staff-scope";
import Restaurant from "@/lib/db/models/restaurant.model";

const utapi = new UTApi(); // Initialize UTApi instance

function normalizeRestaurantId(input: unknown): string | null {
  if (!input) return null;
  const id = String(input).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

async function syncRestaurantMenuItemLink({
  menuItemId,
  previousRestaurantId,
  nextRestaurantId,
}: {
  menuItemId: string;
  previousRestaurantId?: string | null;
  nextRestaurantId?: string | null;
}) {
  const normalizedPrevious = normalizeRestaurantId(previousRestaurantId);
  const normalizedNext = normalizeRestaurantId(nextRestaurantId);
  const menuItemObjectId = new mongoose.Types.ObjectId(menuItemId);

  if (
    normalizedPrevious &&
    (!normalizedNext || normalizedPrevious !== normalizedNext)
  ) {
    await Restaurant.updateOne(
      { _id: new mongoose.Types.ObjectId(normalizedPrevious) },
      { $pull: { menuItems: menuItemObjectId } },
    );
  }

  if (normalizedNext) {
    await Restaurant.updateOne(
      { _id: new mongoose.Types.ObjectId(normalizedNext) },
      { $addToSet: { menuItems: menuItemObjectId } },
    );
  }
}

async function restaurantExists(restaurantId: string): Promise<boolean> {
  const exists = await Restaurant.exists({
    _id: new mongoose.Types.ObjectId(restaurantId),
  });
  return Boolean(exists);
}

async function validateMenuItemNameAgainstOtherRestaurants({
  menuItemName,
  restaurantId,
}: {
  menuItemName: string;
  restaurantId: string;
}): Promise<string | null> {
  const normalized = menuItemName.trim();
  if (!normalized) return null;

  const conflictingRestaurant = await Restaurant.findOne({
    _id: { $ne: new mongoose.Types.ObjectId(restaurantId) },
    name: { $regex: new RegExp(`^${escapeRegExp(normalized)}$`, "i") },
  })
    .select("name")
    .lean();

  if (!conflictingRestaurant) return null;

  return `Menu item name conflicts with another restaurant name (${conflictingRestaurant.name}).`;
}

async function getHiddenRestaurantIdsForStorefront() {
  const hiddenRestaurants = await Restaurant.find({
    $or: [
      { status: { $ne: "approved" } },
      { isApproved: false },
      { isActive: false },
    ],
  })
    .select("_id")
    .lean();

  return hiddenRestaurants.map((restaurant) => restaurant._id);
}

async function getStorefrontVisibilityFilter() {
  const hiddenRestaurantIds = await getHiddenRestaurantIdsForStorefront();

  if (hiddenRestaurantIds.length === 0) {
    return {};
  }

  return {
    $or: [
      { restaurant: { $exists: false } },
      { restaurant: null },
      { restaurant: { $nin: hiddenRestaurantIds } },
    ],
  };
}

// CREATE
export async function createMenuItem(
  data: IMenuItemInput,
): Promise<ActionState> {
  try {
    const scope = await getStaffScope();
    const validated = MenuItemInputSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }
    const menuItem = validated.data;
    const restaurantId =
      scope.role === "RESTAURANT"
        ? scope.restaurantId
        : normalizeRestaurantId(menuItem.restaurant);

    if (!restaurantId) {
      return {
        success: false,
        message: "Restaurant is required",
        errors: { restaurant: ["Restaurant is required"] },
      };
    }
    if (!(await restaurantExists(restaurantId))) {
      return {
        success: false,
        message: "Selected restaurant does not exist",
        errors: { restaurant: ["Selected restaurant does not exist"] },
      };
    }

    const nameConflictMessage = await validateMenuItemNameAgainstOtherRestaurants({
      menuItemName: menuItem.name,
      restaurantId,
    });
    if (nameConflictMessage) {
      return {
        success: false,
        message: nameConflictMessage,
        errors: { name: [nameConflictMessage] },
      };
    }

    const created = await MenuItem.create({
      ...menuItem,
      restaurant: restaurantId,
    });

    await syncRestaurantMenuItemLink({
      menuItemId: created._id.toString(),
      nextRestaurantId: restaurantId,
    });

    revalidatePath("/admin/menu-items");
    updateTag("menuItems");
    return {
      success: true,
      message: "Menu item created successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// UPDATE
export async function updateMenuItem(
  data: z.infer<typeof MenuItemUpdateSchema>,
): Promise<ActionState> {
  try {
    const scope = await getStaffScope();
    const validated = MenuItemUpdateSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }
    const menuItem = validated.data;

    if (
      typeof menuItem.countInStock === "number" &&
      menuItem.countInStock < 0
    ) {
      throw new Error("Count in stock cannot be negative");
    }

    const filter =
      scope.role === "RESTAURANT"
        ? { _id: menuItem._id, restaurant: scope.restaurantId }
        : { _id: menuItem._id };

    const existing = await MenuItem.findOne(filter).select("_id restaurant");
    if (!existing) {
      throw new Error("Menu item not found or unauthorized");
    }

    const previousRestaurantId = normalizeRestaurantId(existing.restaurant);
    const nextRestaurantId =
      scope.role === "RESTAURANT"
        ? scope.restaurantId
        : normalizeRestaurantId(menuItem.restaurant) || previousRestaurantId;

    if (!nextRestaurantId) {
      return {
        success: false,
        message: "Restaurant is required",
        errors: { restaurant: ["Restaurant is required"] },
      };
    }
    if (!(await restaurantExists(nextRestaurantId))) {
      return {
        success: false,
        message: "Selected restaurant does not exist",
        errors: { restaurant: ["Selected restaurant does not exist"] },
      };
    }

    const nameConflictMessage = await validateMenuItemNameAgainstOtherRestaurants({
      menuItemName: menuItem.name,
      restaurantId: nextRestaurantId,
    });
    if (nameConflictMessage) {
      return {
        success: false,
        message: nameConflictMessage,
        errors: { name: [nameConflictMessage] },
      };
    }

    const updated = await MenuItem.findOneAndUpdate(
      filter,
      { ...menuItem, restaurant: nextRestaurantId },
      {
        new: true,
      },
    );

    if (!updated) {
      throw new Error("Menu item not found or unauthorized");
    }

    await syncRestaurantMenuItemLink({
      menuItemId: updated._id.toString(),
      previousRestaurantId,
      nextRestaurantId,
    });

    revalidatePath("/admin/menu-items");
    updateTag("menuItems");
    return {
      success: true,
      message: "Menu updated successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// DELETE
export async function deleteMenuItem(id: string) {
  try {
    const scope = await getStaffScope();

    const filter =
      scope.role === "RESTAURANT"
        ? { _id: id, restaurant: scope.restaurantId }
        : { _id: id };

    const menuItem = await MenuItem.findOne(filter);
    if (!menuItem) throw new Error("Menu item not found");
    const previousRestaurantId = normalizeRestaurantId(menuItem.restaurant);

    // Delete images from UploadThing
    if (menuItem.images && menuItem.images.length > 0) {
      await Promise.all(
        menuItem.images.map(async (imageUrl: string) => {
          const fileKeys = imageUrl.split("/").pop(); // Extract file key
          if (fileKeys) {
            await utapi.deleteFiles(fileKeys); // Use the UTApi instance
          }
        }),
      );
    }

    // Delete menuItem from the database
    await MenuItem.findOneAndDelete(filter);
    await syncRestaurantMenuItemLink({
      menuItemId: menuItem._id.toString(),
      previousRestaurantId,
      nextRestaurantId: null,
    });

    revalidatePath("/admin/menu-items");
    updateTag("menuItems");

    return {
      success: true,
      message: "Menu item and associated images deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getRestaurantsForMenuItemInput() {
  "use cache: private";
  cacheLife("minutes");

  const scope = await getStaffScope();
  await connectToDatabase();

  const match =
    scope.role === "RESTAURANT"
      ? { _id: new mongoose.Types.ObjectId(scope.restaurantId) }
      : { status: "approved", isApproved: true };

  const restaurants = await Restaurant.find(match)
    .select("_id name")
    .sort({ name: 1 })
    .lean();

  return restaurants.map((restaurant) => ({
    _id: restaurant._id.toString(),
    name: restaurant.name,
  }));
}

// GET ONE PRODUCT BY ID
export async function getMenuItemById(menuItemId: string) {
  const scope = await getStaffScope();
  const filter =
    scope.role === "RESTAURANT"
      ? { _id: menuItemId, restaurant: scope.restaurantId }
      : { _id: menuItemId };

  const menuItem = await MenuItem.findOne(filter).lean();
  if (!menuItem) return null;
  return {
    ...menuItem,
    _id: menuItem._id.toString(),
    createdAt: menuItem.createdAt?.toISOString(),
    updatedAt: menuItem.updatedAt?.toISOString(),
  } as unknown as IMenuItem;
}

export async function getMenuItemsByIds(menuItemIds: string[]) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");
  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();

  const objectIds = menuItemIds.map((id) => new mongoose.Types.ObjectId(id));
  const menuItems = await MenuItem.find({
    _id: { $in: objectIds },
    ...storefrontVisibilityFilter,
  }).lean();

  const safeMenuItems = menuItems.map((menuItem) => ({
    ...menuItem,
    _id: menuItem._id.toString(),
    createdAt: menuItem.createdAt?.toISOString(),
    updatedAt: menuItem.updatedAt?.toISOString(),
  }));

  return safeMenuItems as unknown as IMenuItem[];
}

// GET ALL menuItems FOR ADMIN
export async function getAllMenuItemsForAdmin({
  query,
  page = 1,
  sort = "latest",
  limit,
  category,
  tag,
  isPublished,
  from,
  to,
}: {
  query: string;
  page?: number;
  sort?: string;
  limit?: number;
  category?: string;
  tag?: string;
  isPublished?: string;
  from?: string;
  to?: string;
}) {
  const scope = await getStaffScope();

  const {
    common: { pageSize },
  } = await getSetting();
  limit = limit || pageSize;

  const LOW_STOCK_THRESHOLD = 10;

  const queryFilter =
    query && query !== "all"
      ? {
          name: {
            $regex: escapeRegExp(query),
            $options: "i",
          },
        }
      : {};

  const categoryFilter =
    category && category !== "all"
      ? { category: { $regex: new RegExp(`^${escapeRegExp(category)}$`, "i") } }
      : {};
  const tagFilter =
    tag && tag !== "all"
      ? { tags: { $regex: new RegExp(`^${escapeRegExp(tag)}$`, "i") } }
      : {};

  let publishedFilter = {};
  if (isPublished === "true") {
    publishedFilter = { isPublished: true };
  } else if (isPublished === "false") {
    publishedFilter = { isPublished: false };
  } else if (isPublished === "out_of_stock") {
    publishedFilter = { countInStock: { $lte: 0 } };
  } else if (isPublished === "low_stock") {
    publishedFilter = { countInStock: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 } };
  }

  const dateFilter =
    from || to
      ? {
          updatedAt: {
            ...(from ? { $gte: new Date(from) } : {}),
            ...(to
              ? {
                  $lte: (() => {
                    const d = new Date(to);
                    d.setHours(23, 59, 59, 999);
                    return d;
                  })(),
                }
              : {}),
          },
        }
      : {};

  const filters = {
    ...(scope.role === "RESTAURANT"
      ? { restaurant: new mongoose.Types.ObjectId(scope.restaurantId) }
      : {}),
    ...queryFilter,
    ...categoryFilter,
    ...tagFilter,
    ...publishedFilter,
    ...dateFilter,
  };

  const order: Record<string, 1 | -1> =
    sort === "best-selling"
      ? { numSales: -1 }
      : sort === "price-low-to-high"
        ? { price: 1 }
        : sort === "price-high-to-low"
          ? { price: -1 }
          : sort === "avg-customer-review"
            ? { avgRating: -1 }
            : { _id: -1 };

  const menuItems = await MenuItem.find(filters)
    .sort(order)
    .skip(limit * (Number(page) - 1))
    .limit(limit)
    .lean();

  const countMenuItems = await MenuItem.countDocuments(filters);

  return {
    menuItems: JSON.parse(JSON.stringify(menuItems)) as IMenuItem[],
    totalPages: Math.ceil(countMenuItems / limit),
    totalMenuItems: countMenuItems,
    from: limit * (Number(page) - 1) + 1,
    to: limit * (Number(page) - 1) + menuItems.length,
  };
}

export async function getMenuItemAdminStats(params: {
  query?: string;
  category?: string;
  tag?: string;
  gender?: string;
  from?: string;
  to?: string;
}) {
  const scope = await getStaffScope();

  const LOW_STOCK_THRESHOLD = 10;

  const queryFilter =
    params.query && params.query !== "all"
      ? {
          name: {
            $regex: params.query,
            $options: "i",
          },
        }
      : {};

  const categoryFilter =
    params.category && params.category !== "all"
      ? {
          category: {
            $regex: new RegExp(`^${escapeRegExp(params.category)}$`, "i"),
          },
        }
      : {};
  const tagFilter =
    params.tag && params.tag !== "all"
      ? { tags: { $regex: new RegExp(`^${escapeRegExp(params.tag)}$`, "i") } }
      : {};

  const genderFilter =
    params.gender && params.gender !== "all"
      ? {
          gender: {
            $regex: new RegExp(`^${escapeRegExp(params.gender)}$`, "i"),
          },
        }
      : {};

  const dateFilter =
    params.from || params.to
      ? {
          updatedAt: {
            ...(params.from ? { $gte: new Date(params.from) } : {}),
            ...(params.to
              ? {
                  $lte: (() => {
                    const d = new Date(params.to);
                    d.setHours(23, 59, 59, 999);
                    return d;
                  })(),
                }
              : {}),
          },
        }
      : {};

  const baseFilters = {
    ...(scope.role === "RESTAURANT"
      ? { restaurant: new mongoose.Types.ObjectId(scope.restaurantId) }
      : {}),
    ...queryFilter,
    ...categoryFilter,
    ...tagFilter,
    ...genderFilter,
    ...dateFilter,
  };

  const [
    totalMenuItems,
    publishedMenuItems,
    draftMenuItems,
    outOfStockMenuItems,
    lowStockMenuItems,
  ] = await Promise.all([
    MenuItem.countDocuments(baseFilters),
    MenuItem.countDocuments({ ...baseFilters, isPublished: true }),
    MenuItem.countDocuments({ ...baseFilters, isPublished: false }),
    MenuItem.countDocuments({ ...baseFilters, countInStock: { $lte: 0 } }),
    MenuItem.countDocuments({
      ...baseFilters,
      countInStock: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 },
    }),
  ]);

  return {
    totalMenuItems,
    publishedMenuItems,
    draftMenuItems,
    outOfStockMenuItems,
    lowStockMenuItems,
  };
}

// GET ALL CATEGORIES
export async function getAllCategories(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");
  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();
  const categories = await MenuItem.aggregate([
    {
      $match: {
        isPublished: true,
        category: { $exists: true, $ne: "" },
        ...storefrontVisibilityFilter,
      },
    },
    { $project: { category: { $trim: { input: { $toLower: "$category" } } } } },
    { $group: { _id: "$category" } },
    { $sort: { _id: 1 } },
    { $project: { category: "$_id", _id: 0 } },
  ]);

  return categories.map((c) =>
    c.category
      .split(/\s+|-/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
      .trim(),
  );
}

export async function getAllCategoriesForStaffDashboard(): Promise<string[]> {
  "use cache: private";
  cacheLife("minutes");

  const scope = await getStaffScope();
  await connectToDatabase();

  const match: Record<string, unknown> = {
    category: { $exists: true, $ne: "" },
  };

  if (scope.role === "RESTAURANT") {
    match.restaurant = new mongoose.Types.ObjectId(scope.restaurantId);
  }

  const categories = await MenuItem.aggregate([
    { $match: match },
    { $project: { category: { $trim: { input: { $toLower: "$category" } } } } },
    { $group: { _id: "$category" } },
    { $sort: { _id: 1 } },
    { $project: { category: "$_id", _id: 0 } },
  ]);

  return categories.map((c) =>
    c.category
      .split(/\s+|-/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
      .trim(),
  );
}

export async function getMenuItemsForCard({
  tag,
  limit = 4,
}: {
  tag: string;
  limit?: number;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");
  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();
  const menuItems = await MenuItem.find(
    { tags: { $in: [tag] }, isPublished: true, ...storefrontVisibilityFilter },
    {
      name: 1,
      href: { $concat: ["/menuItem/", "$slug"] },
      image: { $arrayElemAt: ["$images", 0] },
    },
  )
    .sort({ createdAt: "desc" })
    .limit(limit);
  return JSON.parse(JSON.stringify(menuItems)) as {
    name: string;
    href: string;
    image: string;
  }[];
}
// GET menuItems BY TAG
export async function getMenuItemsByTag({
  tag,
  limit = 10,
}: {
  tag: string;
  limit?: number;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");
  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();
  const menuItems = await MenuItem.find({
    tags: { $in: [tag] },
    isPublished: true,
    ...storefrontVisibilityFilter,
  })
    .sort({ createdAt: "desc" })
    .limit(limit);
  return JSON.parse(JSON.stringify(menuItems)) as IMenuItem[];
}

export async function getFrequentlyBoughtTogether(menuItemId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems", "orders");
  try {
    await connectToDatabase();
    const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();

    const menuItem = await MenuItem.findOne({
      _id: menuItemId,
      ...storefrontVisibilityFilter,
    }).lean();
    if (!menuItem) return [];

    const ordersWithCurrentMenuItem = await Order.find({
      "items.menuItem": menuItemId,
      isPaid: true,
    })
      .select("items.menuItem")
      .limit(100)
      .lean();

    const menuItemCounts: Record<string, number> = {};
    ordersWithCurrentMenuItem.forEach((order) => {
      const uniqueMenuItemsInOrder = new Set<string>();
      order.items.forEach((item) => {
        const otherMenuItemId = item.menuItem.toString();
        if (otherMenuItemId !== menuItemId) {
          uniqueMenuItemsInOrder.add(otherMenuItemId);
        }
      });
      uniqueMenuItemsInOrder.forEach((id) => {
        menuItemCounts[id] = (menuItemCounts[id] || 0) + 1;
      });
    });

    const topMenuItemIds = Object.entries(menuItemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([id]) => id);

    let frequentlyBoughtTogether: IMenuItem[] = [];
    if (topMenuItemIds.length > 0) {
      const menuItems = await MenuItem.find({
        _id: { $in: topMenuItemIds },
        isPublished: true,
        ...storefrontVisibilityFilter,
      }).lean();
      frequentlyBoughtTogether = menuItems as unknown as IMenuItem[];
    }

    // Fallback to related menuItems if we don't have enough frequently bought together
    if (frequentlyBoughtTogether.length < 2) {
      const related = await MenuItem.find({
        category: menuItem.category,
        _id: { $ne: menuItemId, $nin: topMenuItemIds },
        isPublished: true,
        ...storefrontVisibilityFilter,
      })
        .sort({ numSales: -1 })
        .limit(2 - frequentlyBoughtTogether.length)
        .lean();
      frequentlyBoughtTogether = [
        ...frequentlyBoughtTogether,
        ...(related as unknown as IMenuItem[]),
      ];
    }

    return JSON.parse(JSON.stringify(frequentlyBoughtTogether)) as IMenuItem[];
  } catch (error) {
    console.error("Error in getFrequentlyBoughtTogether:", error);
    return [];
  }
}

// GET ONE PRODUCT BY SLUG
export async function getMenuItemBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");
  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();
  const menuItem = await MenuItem.findOne({
    slug,
    isPublished: true,
    ...storefrontVisibilityFilter,
  });
  if (!menuItem) return notFound();
  return JSON.parse(JSON.stringify(menuItem)) as IMenuItem;
}

// GET RELATED menuItems: menuItems WITH SAME CATEGORY
export async function getRelatedMenuItemsByCategory({
  category,
  menuItemId,
  limit = 4,
  page = 1,
}: {
  category: string;
  menuItemId: string;
  limit?: number;
  page: number;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");
  const {
    common: { pageSize },
  } = await getSetting();
  limit = limit || pageSize;

  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();
  const skipAmount = (Number(page) - 1) * limit;
  const conditions = {
    isPublished: true,
    category,
    _id: { $ne: menuItemId },
    ...storefrontVisibilityFilter,
  };
  const menuItems = await MenuItem.find(conditions)
    .sort({ numSales: "desc" })
    .skip(skipAmount)
    .limit(limit);
  const menuItemsCount = await MenuItem.countDocuments(conditions);
  return {
    data: JSON.parse(JSON.stringify(menuItems)) as IMenuItem[],
    totalPages: Math.ceil(menuItemsCount / limit),
  };
}

// GET ALL menuItems
export async function getAllMenuItems({
  query,
  limit,
  page,
  category,
  tag,
  price,
  rating,
  sort,
  restaurantId,
}: {
  query: string;
  category: string;
  tag: string;
  limit?: number;
  page: number;
  price?: string;
  rating?: string;
  sort?: string;
  restaurantId?: string;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");

  const {
    common: { pageSize },
  } = await getSetting();

  const pageLimit = limit ?? pageSize;
  const skip = pageLimit * (page - 1);

  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();

  const queryFilter =
    query && query !== "all"
      ? {
          name: {
            $regex: escapeRegExp(query),
            $options: "i",
          },
        }
      : {};

  const categoryFilter =
    category && category !== "all"
      ? {
          category: {
            $regex: `^${escapeRegExp(category)}$`,
            $options: "i",
          },
        }
      : {};

  const tagFilter =
    tag && tag !== "all"
      ? {
          tags: {
            $elemMatch: {
              $regex: `^${escapeRegExp(tag)}$`,
              $options: "i",
            },
          },
        }
      : {};

  const ratingFilter =
    rating && rating !== "all"
      ? {
          avgRating: {
            $gte: Number(rating),
          },
        }
      : {};

  const priceFilter =
    price && price !== "all"
      ? {
          price: {
            $gte: Number(price.split("-")[0]),
            $lte: Number(price.split("-")[1]),
          },
        }
      : {};

  const isPublishedFilter = { isPublished: true };
  const restaurantFilter =
    restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)
      ? { restaurant: new mongoose.Types.ObjectId(restaurantId) }
      : {};

  const sortOrder: Record<string, 1 | -1> =
    sort === "best-selling"
      ? { numSales: -1 }
      : sort === "price-low-to-high"
        ? { price: 1 }
        : sort === "price-high-to-low"
          ? { price: -1 }
          : sort === "avg-customer-review"
            ? { avgRating: -1 }
            : { _id: -1 };

  const filters = {
    ...isPublishedFilter,
    ...storefrontVisibilityFilter,
    ...restaurantFilter,
    ...queryFilter,
    ...categoryFilter,
    ...tagFilter,
    ...priceFilter,
    ...ratingFilter,
  };

  const [menuItems, totalMenuItems] = await Promise.all([
    MenuItem.find(filters).sort(sortOrder).skip(skip).limit(pageLimit).lean(),

    MenuItem.countDocuments(filters),
  ]);

  return {
    menuItems: JSON.parse(JSON.stringify(menuItems)) as IMenuItem[],
    totalMenuItems,
    totalPages: Math.ceil(totalMenuItems / pageLimit),
    from: skip + 1,
    to: skip + menuItems.length,
  };
}

export async function getAllCategoriesForStorefrontRestaurant(
  restaurantId: string,
): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");

  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    return [];
  }

  const categories = await MenuItem.aggregate([
    {
      $match: {
        restaurant: new mongoose.Types.ObjectId(restaurantId),
        isPublished: true,
        category: { $exists: true, $ne: "" },
      },
    },
    { $project: { category: { $trim: { input: { $toLower: "$category" } } } } },
    { $group: { _id: "$category" } },
    { $sort: { _id: 1 } },
    { $project: { category: "$_id", _id: 0 } },
  ]);

  return categories.map((c) =>
    c.category
      .split(/\s+|-/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
      .trim(),
  );
}

export async function getAllTagsForStorefrontRestaurant(restaurantId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");

  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    return [];
  }

  const tags = await MenuItem.aggregate([
    {
      $match: {
        restaurant: new mongoose.Types.ObjectId(restaurantId),
        isPublished: true,
        tags: { $exists: true, $ne: [] },
      },
    },
    { $unwind: "$tags" },
    {
      $set: {
        tags: {
          $trim: { input: { $toLower: "$tags" } },
        },
      },
    },
    { $group: { _id: "$tags" } },
    { $sort: { _id: 1 } },
    { $project: { tag: "$_id", _id: 0 } },
  ]);

  return tags.map(({ tag }) =>
    tag
      .split(" ")
      .map((word: string) =>
        word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-"),
      )
      .join(" ")
      .trim(),
  );
}

export async function getAllTags() {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");

  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();

  const tags = await MenuItem.aggregate([
    // Ensure tags exist and are not empty
    { $match: { tags: { $exists: true, $ne: [] }, ...storefrontVisibilityFilter } },

    // Unwind the tags array
    { $unwind: "$tags" },

    // Normalize for deduplication
    {
      $set: {
        tags: {
          $trim: { input: { $toLower: "$tags" } },
        },
      },
    },

    // Ensure uniqueness
    { $group: { _id: "$tags" } },

    // Sort alphabetically
    { $sort: { _id: 1 } },

    // Format output
    { $project: { tag: "$_id", _id: 0 } },
  ]);

  // Format tags while preserving dashes
  return tags.map(({ tag }) =>
    tag
      .split(" ") // handle multi-word tags
      .map((word: string) =>
        word
          .split("-") // handle dashed words
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-"),
      )
      .join(" ")
      .trim(),
  );
}

export async function getAllTagsForStaffDashboard() {
  "use cache: private";
  cacheLife("minutes");

  const scope = await getStaffScope();
  await connectToDatabase();

  const match: Record<string, unknown> = {
    tags: { $exists: true, $ne: [] },
  };

  if (scope.role === "RESTAURANT") {
    match.restaurant = new mongoose.Types.ObjectId(scope.restaurantId);
  }

  const tags = await MenuItem.aggregate([
    { $match: match },
    { $unwind: "$tags" },
    {
      $set: {
        tags: {
          $trim: { input: { $toLower: "$tags" } },
        },
      },
    },
    { $group: { _id: "$tags" } },
    { $sort: { _id: 1 } },
    { $project: { tag: "$_id", _id: 0 } },
  ]);

  return tags.map(({ tag }) =>
    tag
      .split(" ")
      .map((word: string) =>
        word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-"),
      )
      .join(" ")
      .trim(),
  );
}

export async function getAllTagsForAdminMenuItemCreate() {
  "use cache: private";
  cacheLife("minutes");
  const scope = await getStaffScope();
  await connectToDatabase();

  const match: Record<string, unknown> = {
    tags: { $exists: true, $ne: [] },
  };
  if (scope.role === "RESTAURANT") {
    match.restaurant = new mongoose.Types.ObjectId(scope.restaurantId);
  }

  const tags = await MenuItem.aggregate([
    { $match: match },
    { $unwind: "$tags" },
    {
      $set: {
        tags: {
          $trim: { input: "$tags" },
        },
      },
    },
    { $group: { _id: "$tags" } },
    { $sort: { _id: 1 } },
    { $project: { tag: "$_id", _id: 0 } },
  ]);

  return tags
    .map((t) => t.tag)
    .filter((tag): tag is string => Boolean(tag?.trim()));
}

export async function getMenuItemsByCategory({
  category,
  limit = 10,
}: {
  category: string;
  limit?: number;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag("menuItems");

  await connectToDatabase();
  const storefrontVisibilityFilter = await getStorefrontVisibilityFilter();

  const menuItems = await MenuItem.find({
    category: { $regex: new RegExp(`^${category}$`, "i") }, // case-insensitive match
    isPublished: true,
    ...storefrontVisibilityFilter,
  })
    .sort({ createdAt: -1 }) // newest first
    .limit(limit);

  return JSON.parse(JSON.stringify(menuItems)) as IMenuItem[];
}
