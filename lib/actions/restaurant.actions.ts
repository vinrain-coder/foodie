"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../db";
import Restaurant, {
  type RestaurantApplicationStatus,
} from "../db/models/restaurant.model";
import User from "../db/models/user.model";
import { RestaurantApplicationInputSchema } from "../validator";
import {
  escapeRegExp,
  flattenZodErrors,
  formatError,
  toSlug,
} from "../utils";
import type { ActionState } from "@/types/action-state";
import { getServerSession } from "../get-session";
import { sendAdminEventNotification } from "../email/transactional";
import { getSetting } from "./setting.actions";
import MenuItem from "../db/models/menu.item.model";
import mongoose from "mongoose";

type RestaurantApplicationSnapshot = {
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  phone: string;
  whatsapp: string;
  location: string;
  description: string;
  openingHours: string;
  deliveryFee: number;
  minimumOrderAmount: number;
  email: string;
  cuisineTypes: string[];
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  averagePrepTimeMinutes: number;
};

export type RestaurantSettingsInput = RestaurantApplicationSnapshot;

export type StorefrontRestaurantCard = {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  location: string;
  description: string;
  cuisineTypes: string[];
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minimumOrderAmount: number;
  deliveryFee: number;
  menuItemsCount: number;
};

export type RestaurantApplicationStatusResponse =
  | {
      exists: false;
      authenticated: boolean;
      error?: boolean;
      message?: string;
    }
  | {
      exists: true;
      authenticated: true;
      status: RestaurantApplicationStatus;
      isApproved: boolean;
      isActive: boolean;
      adminNote: string;
      application: RestaurantApplicationSnapshot;
    };

export async function registerRestaurantApplication(
  data: unknown,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session) throw new Error("User not authenticated");
    if (session.user.role !== "RESTAURANT") throw new Error("Unauthorized");

    const validated = RestaurantApplicationInputSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }

    const payload = {
      ...validated.data,
      slug: toSlug(validated.data.slug),
    };

    if (payload.slug.length < 3) {
      throw new Error("Slug must be at least 3 characters");
    }

    const existingApplication = await Restaurant.findOne({
      ownerId: session.user.id,
    });

    const conflictingSlug = await Restaurant.findOne({ slug: payload.slug });

    if (existingApplication) {
      if (existingApplication.status !== "rejected") {
        throw new Error("You already have a restaurant application in progress");
      }

      if (
        conflictingSlug &&
        conflictingSlug._id.toString() !== existingApplication._id.toString()
      ) {
        throw new Error("Restaurant slug is already taken");
      }

      existingApplication.set({
        ...payload,
        status: "pending",
        isApproved: false,
        isActive: false,
        adminNote: "",
      });
      await existingApplication.save();

      await sendAdminEventNotification({
        title: "Restaurant application resubmitted",
        description: `${session.user.name || "A user"} resubmitted a restaurant application (${existingApplication.name}).`,
        href: "/admin/restaurants",
        meta: "Review required",
        createdAt: existingApplication.updatedAt.toISOString(),
      });

      revalidatePath("/restaurant/register");
      return {
        success: true,
        message: "Restaurant application resubmitted successfully",
        data: JSON.parse(JSON.stringify(existingApplication)),
      };
    }

    if (conflictingSlug) {
      throw new Error("Restaurant slug is already taken");
    }

    const created = await Restaurant.create({
      ...payload,
      ownerId: session.user.id,
      status: "pending",
      isApproved: false,
      isActive: false,
      adminNote: "",
    });

    await sendAdminEventNotification({
      title: "New restaurant application",
      description: `${session.user.name || "A user"} submitted a restaurant application (${created.name}).`,
      href: "/admin/restaurants",
      meta: "Application pending",
      createdAt: created.createdAt.toISOString(),
    });

    revalidatePath("/restaurant/register");

    return {
      success: true,
      message: "Restaurant application submitted successfully",
      data: JSON.parse(JSON.stringify(created)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getRestaurantApplicationStatus(): Promise<RestaurantApplicationStatusResponse> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session) return { exists: false, authenticated: false };

    const application = await Restaurant.findOne({
      ownerId: session.user.id,
    }).lean();

    if (!application) return { exists: false, authenticated: true };

    return {
      exists: true,
      authenticated: true,
      status: application.status as RestaurantApplicationStatus,
      isApproved: application.isApproved,
      isActive: application.isActive,
      adminNote: application.adminNote || "",
      application: {
        name: application.name,
        slug: application.slug,
        logo: application.logo || "",
        coverImage: application.coverImage || "",
        phone: application.phone,
        whatsapp: application.whatsapp,
        location: application.location,
        description: application.description,
        openingHours: application.openingHours,
        deliveryFee: application.deliveryFee,
        minimumOrderAmount: application.minimumOrderAmount,
        email: application.email || "",
        cuisineTypes: application.cuisineTypes || [],
        acceptsDelivery: application.acceptsDelivery,
        acceptsPickup: application.acceptsPickup,
        averagePrepTimeMinutes: application.averagePrepTimeMinutes || 30,
      },
    };
  } catch (error) {
    console.error("Error getting restaurant application status:", error);
    return {
      exists: false,
      authenticated: false,
      error: true,
      message: formatError(error),
    };
  }
}

export async function getAllRestaurantApplications({
  page = 1,
  limit = 20,
  status,
  query,
  from,
  to,
}: {
  page?: number;
  limit?: number;
  status?: "all" | RestaurantApplicationStatus;
  query?: string;
  from?: string;
  to?: string;
}) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

    const filter: Record<string, any> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    if (query) {
      const escaped = escapeRegExp(query.trim());
      const regex = new RegExp(escaped, "i");

      const users = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select("_id");
      const userIds = users.map((u: any) => u._id);

      filter.$or = [
        { name: regex },
        { slug: regex },
        { location: regex },
        { ownerId: { $in: userIds } },
      ];
    }

    const applications = await Restaurant.find(filter)
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Restaurant.countDocuments(filter);

    const safeData = applications.map((application) => ({
      ...application,
      _id: application._id.toString(),
      ownerId: application.ownerId
        ? {
            ...(application.ownerId as any),
            _id: (application.ownerId as any)._id?.toString(),
          }
        : application.ownerId,
      createdAt: application.createdAt?.toISOString(),
      updatedAt: application.updatedAt?.toISOString(),
    }));

    return {
      success: true,
      data: safeData,
      totalPages: Math.ceil(total / limit),
      totalApplications: total,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getRestaurantApplicationAdminStats({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

    const filter: Record<string, any> = {};

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const [total, approved, pending, rejected] = await Promise.all([
      Restaurant.countDocuments(filter),
      Restaurant.countDocuments({ ...filter, status: "approved" }),
      Restaurant.countDocuments({ ...filter, status: "pending" }),
      Restaurant.countDocuments({ ...filter, status: "rejected" }),
    ]);

    return {
      success: true,
      data: {
        total,
        approved,
        pending,
        rejected,
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateRestaurantApplicationStatus(
  id: string,
  status: RestaurantApplicationStatus,
  adminNote?: string,
) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

    const update: Record<string, any> = { status };

    if (status === "approved") {
      update.isApproved = true;
      update.isActive = true;
      update.adminNote = adminNote?.trim() || "";
    }

    if (status === "pending") {
      update.isApproved = false;
      update.isActive = false;
      update.adminNote = adminNote?.trim() || "";
    }

    if (status === "rejected") {
      if (!adminNote?.trim()) {
        throw new Error("A rejection reason is mandatory");
      }
      update.isApproved = false;
      update.isActive = false;
      update.adminNote = adminNote.trim();
    }

    const updated = await Restaurant.findByIdAndUpdate(id, update, {
      new: true,
    }).populate("ownerId", "name email");

    if (!updated) throw new Error("Restaurant application not found");

    if (status === "approved") {
      const ownerId =
        typeof updated.ownerId === "object" && updated.ownerId !== null
          ? (updated.ownerId as any)._id
          : updated.ownerId;
      await User.findByIdAndUpdate(ownerId, { role: "RESTAURANT" });
    }

    revalidatePath("/admin/restaurants");
    revalidatePath("/restaurant/register");

    return {
      success: true,
      message: `Restaurant application ${status}`,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getStorefrontRestaurantFilters() {
  await connectToDatabase();

  const restaurants = await Restaurant.find({
    status: "approved",
    isApproved: true,
    isActive: true,
  })
    .select("cuisineTypes location")
    .lean();

  const cuisineSet = new Set<string>();
  const locationSet = new Set<string>();

  for (const restaurant of restaurants) {
    for (const cuisine of restaurant.cuisineTypes || []) {
      if (cuisine?.trim()) cuisineSet.add(cuisine.trim());
    }
    if (restaurant.location?.trim()) {
      locationSet.add(restaurant.location.trim());
    }
  }

  return {
    cuisines: Array.from(cuisineSet).sort((a, b) => a.localeCompare(b)),
    locations: Array.from(locationSet).sort((a, b) => a.localeCompare(b)),
  };
}

export async function getAllRestaurantsForStorefront({
  query = "",
  cuisine = "all",
  service = "all",
  location = "all",
  sort = "newest",
  page = 1,
  limit,
}: {
  query?: string;
  cuisine?: string;
  service?: "all" | "delivery" | "pickup" | "both";
  location?: string;
  sort?: "newest" | "oldest" | "name-asc" | "name-desc";
  page?: number;
  limit?: number;
}) {
  await connectToDatabase();
  const {
    common: { pageSize },
  } = await getSetting();
  const pageLimit = limit || pageSize;

  const filter: Record<string, any> = {
    status: "approved",
    isApproved: true,
    isActive: true,
  };

  if (query && query !== "all") {
    const escaped = escapeRegExp(query.trim());
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { name: regex },
      { slug: regex },
      { location: regex },
      { description: regex },
      { cuisineTypes: regex },
    ];
  }

  if (cuisine && cuisine !== "all") {
    filter.cuisineTypes = {
      $regex: new RegExp(`^${escapeRegExp(cuisine)}$`, "i"),
    };
  }

  if (location && location !== "all") {
    filter.location = {
      $regex: new RegExp(escapeRegExp(location), "i"),
    };
  }

  if (service === "delivery") {
    filter.acceptsDelivery = true;
  } else if (service === "pickup") {
    filter.acceptsPickup = true;
  } else if (service === "both") {
    filter.acceptsDelivery = true;
    filter.acceptsPickup = true;
  }

  const sortOrder: Record<string, 1 | -1> =
    sort === "oldest"
      ? { createdAt: 1 }
      : sort === "name-asc"
        ? { name: 1 }
        : sort === "name-desc"
          ? { name: -1 }
          : { createdAt: -1 };

  const skip = (Math.max(1, Number(page)) - 1) * pageLimit;

  const [restaurants, totalRestaurants] = await Promise.all([
    Restaurant.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(pageLimit)
      .lean(),
    Restaurant.countDocuments(filter),
  ]);

  const restaurantIds = restaurants.map((restaurant) => restaurant._id);
  const menuCounts = await MenuItem.aggregate([
    {
      $match: {
        restaurant: { $in: restaurantIds },
        isPublished: true,
      },
    },
    { $group: { _id: "$restaurant", count: { $sum: 1 } } },
  ]);
  const countsMap = new Map(
    menuCounts.map((row) => [row._id.toString(), row.count as number]),
  );

  const data: StorefrontRestaurantCard[] = restaurants.map((restaurant) => ({
    _id: restaurant._id.toString(),
    name: restaurant.name,
    slug: restaurant.slug,
    logo: restaurant.logo || "",
    coverImage: restaurant.coverImage || "",
    location: restaurant.location,
    description: restaurant.description,
    cuisineTypes: restaurant.cuisineTypes || [],
    acceptsDelivery: restaurant.acceptsDelivery,
    acceptsPickup: restaurant.acceptsPickup,
    minimumOrderAmount: Number(restaurant.minimumOrderAmount || 0),
    deliveryFee: Number(restaurant.deliveryFee || 0),
    menuItemsCount: countsMap.get(restaurant._id.toString()) || 0,
  }));

  return {
    data,
    totalRestaurants,
    totalPages: Math.max(1, Math.ceil(totalRestaurants / pageLimit)),
    from: totalRestaurants === 0 ? 0 : skip + 1,
    to: totalRestaurants === 0 ? 0 : skip + data.length,
  };
}

export async function getRestaurantBySlugForStorefront(slug: string) {
  await connectToDatabase();
  const restaurant = await Restaurant.findOne({
    slug,
    status: "approved",
    isApproved: true,
    isActive: true,
  }).lean();

  if (!restaurant) return null;

  const menuItemsCount = await MenuItem.countDocuments({
    restaurant: new mongoose.Types.ObjectId(restaurant._id.toString()),
    isPublished: true,
  });

  return {
    _id: restaurant._id.toString(),
    name: restaurant.name,
    slug: restaurant.slug,
    logo: restaurant.logo || "",
    coverImage: restaurant.coverImage || "",
    phone: restaurant.phone,
    whatsapp: restaurant.whatsapp,
    location: restaurant.location,
    description: restaurant.description,
    openingHours: restaurant.openingHours,
    email: restaurant.email || "",
    cuisineTypes: restaurant.cuisineTypes || [],
    acceptsDelivery: restaurant.acceptsDelivery,
    acceptsPickup: restaurant.acceptsPickup,
    averagePrepTimeMinutes: Number(restaurant.averagePrepTimeMinutes || 30),
    deliveryFee: Number(restaurant.deliveryFee || 0),
    minimumOrderAmount: Number(restaurant.minimumOrderAmount || 0),
    menuItemsCount,
  };
}

export async function getRestaurantSettingsForOwner(): Promise<{
  success: boolean;
  data?: RestaurantSettingsInput;
  message?: string;
}> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session) throw new Error("User not authenticated");
    if (session.user.role !== "RESTAURANT") throw new Error("Unauthorized");

    const restaurant = await Restaurant.findOne({
      ownerId: session.user.id,
      status: "approved",
      isApproved: true,
      isActive: true,
    }).lean();

    if (!restaurant) {
      throw new Error("Restaurant profile not found or inactive");
    }

    return {
      success: true,
      data: {
        name: restaurant.name,
        slug: restaurant.slug,
        logo: restaurant.logo || "",
        coverImage: restaurant.coverImage || "",
        phone: restaurant.phone,
        whatsapp: restaurant.whatsapp,
        location: restaurant.location,
        description: restaurant.description,
        openingHours: restaurant.openingHours,
        deliveryFee: Number(restaurant.deliveryFee || 0),
        minimumOrderAmount: Number(restaurant.minimumOrderAmount || 0),
        email: restaurant.email || "",
        cuisineTypes: restaurant.cuisineTypes || [],
        acceptsDelivery: restaurant.acceptsDelivery,
        acceptsPickup: restaurant.acceptsPickup,
        averagePrepTimeMinutes: Number(
          restaurant.averagePrepTimeMinutes || 30,
        ),
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateRestaurantSettingsForOwner(
  input: unknown,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session) throw new Error("User not authenticated");

    const validated = RestaurantApplicationInputSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }

    const payload = {
      ...validated.data,
      slug: toSlug(validated.data.slug),
    };

    const restaurant = await Restaurant.findOne({
      ownerId: session.user.id,
      status: "approved",
      isApproved: true,
      isActive: true,
    });

    if (!restaurant) {
      throw new Error("Restaurant profile not found or inactive");
    }

    const conflictingSlug = await Restaurant.findOne({
      slug: payload.slug,
      _id: { $ne: restaurant._id },
    })
      .select("_id")
      .lean();

    if (conflictingSlug) {
      throw new Error("Restaurant slug is already taken");
    }

    restaurant.set({
      name: payload.name,
      slug: payload.slug,
      logo: payload.logo,
      coverImage: payload.coverImage,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      location: payload.location,
      description: payload.description,
      openingHours: payload.openingHours,
      deliveryFee: payload.deliveryFee,
      minimumOrderAmount: payload.minimumOrderAmount,
      email: payload.email,
      cuisineTypes: payload.cuisineTypes,
      acceptsDelivery: payload.acceptsDelivery,
      acceptsPickup: payload.acceptsPickup,
      averagePrepTimeMinutes: payload.averagePrepTimeMinutes,
    });

    await restaurant.save();

    revalidatePath("/restaurant-admin/settings");
    revalidatePath("/restaurant-admin/overview");
    revalidatePath("/restaurant-admin/menu-items");
    revalidatePath("/restaurant/register");

    return {
      success: true,
      message: "Restaurant settings updated successfully",
      data: JSON.parse(JSON.stringify(restaurant)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
