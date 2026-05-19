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
