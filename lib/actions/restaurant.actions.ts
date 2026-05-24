"use server";

import { revalidatePath, updateTag } from "next/cache";
import { connectToDatabase } from "../db";
import Restaurant, {
  type RestaurantApplicationStatus,
} from "../db/models/restaurant.model";
import User from "../db/models/user.model";
import {
  RestaurantApplicationInputSchema,
  RestaurantRegistrationInputSchema,
} from "../validator";
import {
  escapeRegExp,
  flattenZodErrors,
  formatError,
  toSlug,
} from "../utils";
import type { ActionState } from "@/types/action-state";
import { getServerSession } from "../get-session";
import {
  sendAdminEventNotification,
  sendRestaurantLifecycleNotification,
} from "../email/transactional";
import { getSetting } from "./setting.actions";
import MenuItem from "../db/models/menu.item.model";
import Review from "../db/models/review.model";
import StockSubscription from "../db/models/stock-subscription.model";
import Order from "../db/models/order.model";
import AffiliateEarning from "../db/models/affiliate-earning.model";
import BNPLPayment from "../db/models/bnpl-payment.model";
import Installment from "../db/models/installment.model";
import CoinTransaction from "../db/models/coin-transaction.model";
import WalletTransaction from "../db/models/wallet-transaction.model";
import FirstPurchaseClaim from "../db/models/first-purchase-claim.model";
import RestaurantBalance from "../db/models/restaurant-balance.model";
import RestaurantLedgerEntry from "../db/models/restaurant-ledger-entry.model";
import RestaurantPayoutAccount from "../db/models/restaurant-payout-account.model";
import RestaurantPayout from "../db/models/restaurant-payout.model";
import RestaurantReview from "../db/models/restaurant-review.model";
import mongoose from "mongoose";
import {
  isAdminRole,
  isRestaurantRole,
  normalizeUserRole,
} from "../dashboard-access";
import { hitRestaurantRegistrationLimit } from "../restaurant-registration-rate-limit";

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
  avgRating: number;
  numReviews: number;
  ratingDistribution: { rating: number; count: number }[];
};

export type MenuItemRestaurantSummary = {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  location: string;
  phone: string;
  whatsapp: string;
  openingHours: string;
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

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || "";

const buildRestaurantEmailRecipients = (...emails: Array<string | undefined | null>) =>
  Array.from(
    new Set(
      emails
        .map((email) => normalizeEmail(email))
        .filter((email) => email.length > 0),
    ),
  );

const logNonCriticalNotificationFailure = (
  context: string,
  result: PromiseSettledResult<unknown>,
) => {
  if (result.status === "rejected") {
    console.error(`Non-critical: Failed to ${context}:`, result.reason);
  }
};

export async function registerRestaurantApplication(
  data: unknown,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session) throw new Error("User not authenticated");
    const normalizedRole = normalizeUserRole(session.user.role);
    const canSubmitRestaurantApplication =
      normalizedRole === "USER" ||
      isRestaurantRole(session.user.role) ||
      isAdminRole(session.user.role);
    if (!canSubmitRestaurantApplication)
      throw new Error("Unauthorized");

    const registrationLimit = hitRestaurantRegistrationLimit(
      `restaurant-register:${session.user.id}`,
    );
    if (!registrationLimit.allowed) {
      throw new Error(
        `Too many registration attempts. Please retry in ${registrationLimit.retryAfterSeconds} seconds.`,
      );
    }

    const isVerifiedEmail = Boolean(
      (session.user as { emailVerified?: boolean }).emailVerified,
    );
    if (!isVerifiedEmail && !isAdminRole(session.user.role)) {
      throw new Error(
        "Please verify your email address before submitting a restaurant application.",
      );
    }

    const validated = RestaurantRegistrationInputSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }

    if ((validated.data.website || "").trim().length > 0) {
      throw new Error("Unable to process this registration request.");
    }

    const {
      termsAccepted: _termsAccepted,
      attestationAccepted: _attestationAccepted,
      website: _website,
      ...registrationData
    } = validated.data;

    const payload = {
      ...registrationData,
      slug: toSlug(registrationData.slug),
      email: registrationData.email?.trim().toLowerCase() || "",
      cuisineTypes: Array.from(
        new Set(
          (registrationData.cuisineTypes || [])
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ),
    };

    if (payload.slug.length < 3) {
      throw new Error("Slug must be at least 3 characters");
    }

    const existingApplication = await Restaurant.findOne({
      ownerId: session.user.id,
    });

    const conflictingSlug = await Restaurant.findOne({ slug: payload.slug });

    const conflictingContact = await Restaurant.findOne({
      ...(existingApplication ? { _id: { $ne: existingApplication._id } } : {}),
      $or: [
        { phone: payload.phone },
        { whatsapp: payload.whatsapp },
        ...(payload.email ? [{ email: payload.email }] : []),
      ],
    })
      .select("_id")
      .lean();

    if (conflictingContact) {
      throw new Error(
        "These business contact details are already linked to another restaurant.",
      );
    }

    if (existingApplication) {
      if (existingApplication.status !== "rejected") {
        throw new Error("You already have a restaurant application in progress");
      }

      const RESUBMISSION_COOLDOWN_MS = 5 * 60_000;
      const elapsedSinceLastUpdate =
        Date.now() - new Date(existingApplication.updatedAt).getTime();
      if (elapsedSinceLastUpdate < RESUBMISSION_COOLDOWN_MS) {
        const retryAfter = Math.ceil(
          (RESUBMISSION_COOLDOWN_MS - elapsedSinceLastUpdate) / 1000,
        );
        throw new Error(
          `Please wait ${retryAfter} seconds before resubmitting.`,
        );
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

      const resubmissionRecipients = buildRestaurantEmailRecipients(
        session.user.email,
        payload.email,
      );

      const resubmissionNotificationResults = await Promise.allSettled([
        sendAdminEventNotification({
          title: "Restaurant application resubmitted",
          description: `${session.user.name || "A user"} resubmitted a restaurant application (${existingApplication.name}).`,
          href: "/admin/restaurants",
          meta: "Review required",
          createdAt: existingApplication.updatedAt.toISOString(),
        }),
        ...(resubmissionRecipients.length > 0
          ? [
              sendRestaurantLifecycleNotification({
                to: resubmissionRecipients.join(","),
                ownerName: session.user.name || "Restaurant owner",
                restaurantName: existingApplication.name,
                status: "resubmitted",
              }),
            ]
          : []),
      ]);

      resubmissionNotificationResults.forEach((result) =>
        logNonCriticalNotificationFailure(
          "dispatch restaurant resubmission notifications",
          result,
        ),
      );

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

    const submissionRecipients = buildRestaurantEmailRecipients(
      session.user.email,
      payload.email,
    );

    const submissionNotificationResults = await Promise.allSettled([
      sendAdminEventNotification({
        title: "New restaurant application",
        description: `${session.user.name || "A user"} submitted a restaurant application (${created.name}).`,
        href: "/admin/restaurants",
        meta: "Application pending",
        createdAt: created.createdAt.toISOString(),
      }),
      ...(submissionRecipients.length > 0
        ? [
            sendRestaurantLifecycleNotification({
              to: submissionRecipients.join(","),
              ownerName: session.user.name || "Restaurant owner",
              restaurantName: created.name,
              status: "submitted",
            }),
          ]
        : []),
    ]);

    submissionNotificationResults.forEach((result) =>
      logNonCriticalNotificationFailure(
        "dispatch restaurant submission notifications",
        result,
      ),
    );

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
  activity = "all",
  query,
  from,
  to,
}: {
  page?: number;
  limit?: number;
  status?: "all" | RestaurantApplicationStatus;
  activity?: "all" | "active" | "inactive";
  query?: string;
  from?: string;
  to?: string;
}) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");

    const filter: Record<string, any> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (activity === "active") {
      filter.status = "approved";
      filter.isApproved = true;
      filter.isActive = true;
    } else if (activity === "inactive") {
      filter.status = "approved";
      filter.isApproved = true;
      filter.isActive = false;
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
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");

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

    const [total, approved, pending, rejected, active, inactive] =
      await Promise.all([
      Restaurant.countDocuments(filter),
      Restaurant.countDocuments({ ...filter, status: "approved" }),
      Restaurant.countDocuments({ ...filter, status: "pending" }),
      Restaurant.countDocuments({ ...filter, status: "rejected" }),
      Restaurant.countDocuments({
        ...filter,
        status: "approved",
        isApproved: true,
        isActive: true,
      }),
      Restaurant.countDocuments({
        ...filter,
        status: "approved",
        isApproved: true,
        isActive: false,
      }),
    ]);

    return {
      success: true,
      data: {
        total,
        approved,
        pending,
        rejected,
        active,
        inactive,
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
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");

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

    const current = await Restaurant.findById(id).select("slug");
    if (!current) throw new Error("Restaurant application not found");

    const previousSlug = current.slug;

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

    const ownerRecord =
      typeof updated.ownerId === "object" && updated.ownerId !== null
        ? (updated.ownerId as { name?: string; email?: string; _id?: unknown })
        : null;

    const applicationRecipients = buildRestaurantEmailRecipients(
      ownerRecord?.email,
      updated.email,
    );

    if (applicationRecipients.length > 0) {
      const lifecycleStatus =
        status === "approved"
          ? "approved"
          : status === "rejected"
            ? "rejected"
            : "pending";

      const applicationNotificationResult = await Promise.allSettled([
        sendRestaurantLifecycleNotification({
          to: applicationRecipients.join(","),
          ownerName: ownerRecord?.name || "Restaurant owner",
          restaurantName: updated.name,
          status: lifecycleStatus,
          adminNote: updated.adminNote || adminNote,
        }),
      ]);

      applicationNotificationResult.forEach((result) =>
        logNonCriticalNotificationFailure(
          "send restaurant application status email",
          result,
        ),
      );
    }

    revalidatePath("/admin/restaurants");
    revalidatePath(`/admin/restaurants/${id}`);
    revalidatePath("/restaurant/register");
    revalidatePath("/restaurant-admin");
    revalidatePath("/restaurants");
    revalidatePath(`/restaurants/${updated.slug}`);
    updateTag("menuItems");
    if (previousSlug !== updated.slug) {
      revalidatePath(`/restaurants/${previousSlug}`);
    }

    return {
      success: true,
      message: `Restaurant application ${status}`,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateRestaurantActivationStatus(
  id: string,
  isActive: boolean,
  adminNote?: string,
) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) throw new Error("Restaurant application not found");

    if (!restaurant.isApproved || restaurant.status !== "approved") {
      throw new Error(
        "Only approved restaurants can be activated or suspended.",
      );
    }

    restaurant.isActive = isActive;
    if (adminNote?.trim()) {
      restaurant.adminNote = adminNote.trim();
    }

    await restaurant.save();

    const owner = await User.findById(restaurant.ownerId)
      .select("name email")
      .lean();

    const activationRecipients = buildRestaurantEmailRecipients(
      owner?.email,
      restaurant.email,
    );

    if (activationRecipients.length > 0) {
      const activationNotificationResult = await Promise.allSettled([
        sendRestaurantLifecycleNotification({
          to: activationRecipients.join(","),
          ownerName: owner?.name || "Restaurant owner",
          restaurantName: restaurant.name,
          status: isActive ? "activated" : "suspended",
          adminNote: restaurant.adminNote || adminNote,
        }),
      ]);

      activationNotificationResult.forEach((result) =>
        logNonCriticalNotificationFailure(
          "send restaurant activation status email",
          result,
        ),
      );
    }

    revalidatePath("/admin/restaurants");
    revalidatePath(`/admin/restaurants/${restaurant._id.toString()}`);
    revalidatePath("/restaurant/register");
    revalidatePath("/restaurant-admin");
    revalidatePath("/restaurants");
    revalidatePath(`/restaurants/${restaurant.slug}`);
    updateTag("menuItems");

    return {
      success: true,
      message: isActive
        ? "Restaurant activated successfully"
        : "Restaurant suspended successfully",
      data: JSON.parse(JSON.stringify(restaurant)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function bulkModerateRestaurantsByAdmin(input: {
  restaurantIds: string[];
  action: "approve" | "reject" | "set_pending" | "activate" | "suspend";
  adminNote?: string;
}): Promise<
  ActionState<{
    requested: number;
    processed: number;
    updated: number;
    skipped: number;
    failed: number;
    failures: Array<{ restaurantId: string; reason: string }>;
  }>
> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");

    const normalizedIds = Array.from(
      new Set(
        (input.restaurantIds || [])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );

    if (normalizedIds.length === 0) {
      throw new Error("Select at least one restaurant");
    }

    if (normalizedIds.length > 100) {
      throw new Error(
        "Bulk restaurant actions are limited to 100 restaurants per request",
      );
    }

    const trimmedAdminNote = String(input.adminNote || "").trim();
    if (input.action === "reject" && !trimmedAdminNote) {
      throw new Error("A rejection reason is mandatory");
    }

    const invalidIds = normalizedIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );
    const validIds = normalizedIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (validIds.length === 0) {
      throw new Error("No valid restaurant ids were provided");
    }

    const restaurants = await Restaurant.find({
      _id: {
        $in: validIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
      .select("_id status isApproved isActive")
      .lean();

    const restaurantById = new Map(
      restaurants.map((restaurant) => [restaurant._id.toString(), restaurant]),
    );

    const failures: Array<{ restaurantId: string; reason: string }> = invalidIds.map(
      (restaurantId) => ({
        restaurantId,
        reason: "Invalid restaurant id",
      }),
    );
    let updated = 0;
    let skipped = 0;

    for (const restaurantId of validIds) {
      const restaurant = restaurantById.get(restaurantId);
      if (!restaurant) {
        failures.push({ restaurantId, reason: "Restaurant not found" });
        continue;
      }

      if (
        input.action === "approve" &&
        restaurant.status === "approved" &&
        restaurant.isApproved &&
        restaurant.isActive
      ) {
        skipped += 1;
        continue;
      }

      if (
        input.action === "set_pending" &&
        restaurant.status === "pending" &&
        !restaurant.isApproved &&
        !restaurant.isActive
      ) {
        skipped += 1;
        continue;
      }

      if (
        input.action === "activate" &&
        restaurant.status === "approved" &&
        restaurant.isApproved &&
        restaurant.isActive
      ) {
        skipped += 1;
        continue;
      }

      if (
        input.action === "suspend" &&
        restaurant.status === "approved" &&
        restaurant.isApproved &&
        !restaurant.isActive
      ) {
        skipped += 1;
        continue;
      }

      let result: ActionState;
      if (
        input.action === "approve" ||
        input.action === "reject" ||
        input.action === "set_pending"
      ) {
        result = await updateRestaurantApplicationStatus(
          restaurantId,
          input.action === "approve"
            ? "approved"
            : input.action === "reject"
              ? "rejected"
              : "pending",
          trimmedAdminNote,
        );
      } else {
        result = await updateRestaurantActivationStatus(
          restaurantId,
          input.action === "activate",
          trimmedAdminNote,
        );
      }

      if (result.success) {
        updated += 1;
      } else {
        failures.push({
          restaurantId,
          reason: result.message || "Failed to process restaurant",
        });
      }
    }

    revalidatePath("/admin/restaurants");

    const processed = validIds.length;
    const failed = failures.length;

    return {
      success: true,
      message: `Bulk ${input.action} completed: ${updated} updated, ${skipped} skipped, ${failed} failed.`,
      data: {
        requested: normalizedIds.length,
        processed,
        updated,
        skipped,
        failed,
        failures: failures.slice(0, 20),
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deleteRestaurantByAdmin(id: string): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid restaurant id");
    }

    const restaurant = await Restaurant.findById(id)
      .select("_id slug ownerId name")
      .lean();

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const restaurantId = new mongoose.Types.ObjectId(id);

    const menuItems = await MenuItem.find({ restaurant: restaurantId })
      .select("_id")
      .lean();
    const menuItemIds = menuItems.map((item) => item._id);

    const orderFilter = {
      $or: [
        { restaurant: restaurantId },
        ...(menuItemIds.length > 0
          ? [{ "items.menuItem": { $in: menuItemIds } }]
          : []),
      ],
    };

    const orders = await Order.find(orderFilter).select("_id").lean();
    const orderIds = orders.map((order) => order._id);

    if (menuItemIds.length > 0) {
      await Promise.all([
        Review.deleteMany({ menuItem: { $in: menuItemIds } }),
        StockSubscription.deleteMany({ menuItem: { $in: menuItemIds } }),
        User.updateMany(
          {
            wishlist: { $type: "array" },
          },
          {
            $pull: {
              wishlist: { $in: menuItemIds },
            },
          },
        ),
      ]);
    }

    if (orderIds.length > 0) {
      await Promise.all([
        AffiliateEarning.deleteMany({ order: { $in: orderIds } }),
        BNPLPayment.deleteMany({ order: { $in: orderIds } }),
        Installment.deleteMany({ order: { $in: orderIds } }),
        CoinTransaction.deleteMany({ order: { $in: orderIds } }),
        WalletTransaction.deleteMany({ order: { $in: orderIds } }),
        FirstPurchaseClaim.deleteMany({ order: { $in: orderIds } }),
      ]);
    }

    await Promise.all([
      RestaurantReview.deleteMany({ restaurant: restaurantId }),
      Order.deleteMany(orderFilter),
      MenuItem.deleteMany({ restaurant: restaurantId }),
      RestaurantLedgerEntry.deleteMany({ restaurant: restaurantId }),
      RestaurantBalance.deleteMany({ restaurant: restaurantId }),
      RestaurantPayout.deleteMany({ restaurant: restaurantId }),
      RestaurantPayoutAccount.deleteMany({ restaurant: restaurantId }),
      Restaurant.deleteOne({ _id: restaurantId }),
    ]);

    const ownerId = restaurant.ownerId?.toString();
    if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
      const hasAnotherRestaurant = await Restaurant.exists({
        ownerId: new mongoose.Types.ObjectId(ownerId),
      });

      if (!hasAnotherRestaurant) {
        const owner = await User.findById(ownerId).select("role").lean();
        if (owner && !isAdminRole(owner.role)) {
          await User.findByIdAndUpdate(ownerId, { role: "USER" });
        }
      }
    }

    revalidatePath("/admin/restaurants");
    revalidatePath(`/admin/restaurants/${id}`);
    revalidatePath("/restaurant-admin");
    revalidatePath("/restaurants");
    revalidatePath(`/restaurants/${restaurant.slug}`);
    updateTag("menuItems");
    updateTag("orders");

    return {
      success: true,
      message: "Restaurant deleted successfully",
      data: { _id: id, name: restaurant.name },
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
  sort?:
    | "newest"
    | "oldest"
    | "name-asc"
    | "name-desc"
    | "rating-high"
    | "rating-low"
    | "most-reviewed";
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
          : sort === "rating-high"
            ? { avgRating: -1, numReviews: -1, createdAt: -1 }
            : sort === "rating-low"
              ? { avgRating: 1, createdAt: -1 }
              : sort === "most-reviewed"
                ? { numReviews: -1, avgRating: -1, createdAt: -1 }
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
    avgRating: Number(restaurant.avgRating || 0),
    numReviews: Number(restaurant.numReviews || 0),
    ratingDistribution: restaurant.ratingDistribution || [],
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
    avgRating: Number(restaurant.avgRating || 0),
    numReviews: Number(restaurant.numReviews || 0),
    ratingDistribution: restaurant.ratingDistribution || [],
  };
}

export async function getRestaurantSummaryForMenuItem(
  params: { restaurantId?: string | null; menuItemId?: string | null },
): Promise<MenuItemRestaurantSummary | null> {
  await connectToDatabase();
  const normalizedRestaurantId = params.restaurantId?.trim() || "";
  const normalizedMenuItemId = params.menuItemId?.trim() || "";

  let restaurant: any = null;

  if (mongoose.Types.ObjectId.isValid(normalizedRestaurantId)) {
    restaurant = await Restaurant.findOne({
      _id: new mongoose.Types.ObjectId(normalizedRestaurantId),
      status: "approved",
      isApproved: true,
      isActive: true,
    })
      .select(
        "name slug logo location phone whatsapp openingHours acceptsDelivery acceptsPickup averagePrepTimeMinutes",
      )
      .lean();
  }

  if (!restaurant && mongoose.Types.ObjectId.isValid(normalizedMenuItemId)) {
    restaurant = await Restaurant.findOne({
      menuItems: new mongoose.Types.ObjectId(normalizedMenuItemId),
      status: "approved",
      isApproved: true,
      isActive: true,
    })
      .select(
        "name slug logo location phone whatsapp openingHours acceptsDelivery acceptsPickup averagePrepTimeMinutes",
      )
      .lean();
  }

  if (!restaurant) return null;

  return {
    _id: restaurant._id.toString(),
    name: restaurant.name,
    slug: restaurant.slug,
    logo: restaurant.logo || "",
    location: restaurant.location,
    phone: restaurant.phone,
    whatsapp: restaurant.whatsapp,
    openingHours: restaurant.openingHours,
    acceptsDelivery: restaurant.acceptsDelivery,
    acceptsPickup: restaurant.acceptsPickup,
    averagePrepTimeMinutes: Number(restaurant.averagePrepTimeMinutes || 30),
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
    if (!isRestaurantRole(session.user.role) && !isAdminRole(session.user.role))
      throw new Error("Unauthorized");

    const restaurant = await Restaurant.findOne({
      ownerId: session.user.id,
    }).lean();

    if (!restaurant) {
      throw new Error("Restaurant profile not found");
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
    if (!isRestaurantRole(session.user.role) && !isAdminRole(session.user.role))
      throw new Error("Unauthorized");

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
    });

    if (!restaurant) {
      throw new Error("Restaurant profile not found");
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
      ...(restaurant.status !== "approved"
        ? {
            status: "pending",
            isApproved: false,
            isActive: false,
          }
        : {}),
    });

    await restaurant.save();

    revalidatePath("/restaurant-admin/settings");
    revalidatePath("/restaurant-admin/overview");
    revalidatePath("/restaurant-admin/menu-items");
    revalidatePath("/restaurant/register");
    revalidatePath("/restaurants");
    revalidatePath(`/restaurants/${restaurant.slug}`);

    return {
      success: true,
      message: "Restaurant settings updated successfully",
      data: JSON.parse(JSON.stringify(restaurant)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getRestaurantSettingsByIdForAdmin(
  restaurantId: string,
): Promise<{
  success: boolean;
  data?: RestaurantSettingsInput & {
    _id: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    status: RestaurantApplicationStatus;
    isApproved: boolean;
    isActive: boolean;
    adminNote: string;
  };
  message?: string;
}> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new Error("Invalid restaurant id");
    }

    const restaurant = await Restaurant.findById(restaurantId)
      .populate("ownerId", "name email")
      .lean();

    if (!restaurant) {
      throw new Error("Restaurant profile not found");
    }

    const owner =
      typeof restaurant.ownerId === "object" && restaurant.ownerId !== null
        ? (restaurant.ownerId as { _id?: unknown; name?: string; email?: string })
        : null;

    return {
      success: true,
      data: {
        _id: restaurant._id.toString(),
        ownerId: owner?._id ? String(owner._id) : "",
        ownerName: owner?.name || "Unknown owner",
        ownerEmail: owner?.email || "",
        status: restaurant.status,
        isApproved: !!restaurant.isApproved,
        isActive: !!restaurant.isActive,
        adminNote: restaurant.adminNote || "",
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

export async function updateRestaurantSettingsByAdmin(
  restaurantId: string,
  input: unknown,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!isAdminRole(session?.user?.role)) throw new Error("Unauthorized");
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new Error("Invalid restaurant id");
    }

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

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new Error("Restaurant profile not found");
    const oldSlug = restaurant.slug;

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

    revalidatePath("/admin/restaurants");
    revalidatePath(`/admin/restaurants/${restaurant._id.toString()}`);
    revalidatePath("/restaurant-admin/settings");
    revalidatePath("/restaurant-admin/overview");
    revalidatePath("/restaurant-admin/menu-items");
    revalidatePath("/restaurant/register");
    revalidatePath("/restaurants");
    revalidatePath(`/restaurants/${restaurant.slug}`);
    if (oldSlug !== restaurant.slug) {
      revalidatePath(`/restaurants/${oldSlug}`);
    }

    return {
      success: true,
      message: "Restaurant profile updated successfully",
      data: JSON.parse(JSON.stringify(restaurant)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
