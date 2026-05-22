"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionState } from "@/types/action-state";
import { IRestaurantReviewDetails } from "@/types";
import { connectToDatabase } from "../db";
import Restaurant from "../db/models/restaurant.model";
import RestaurantReview from "../db/models/restaurant-review.model";
import { getServerSession } from "../get-session";
import { canAccessAdminDashboard } from "../dashboard-access";
import { sendAdminEventNotification } from "../email/transactional";
import { getSetting } from "./setting.actions";
import { RestaurantReviewInputSchema } from "../validator";
import { flattenZodErrors, formatError } from "../utils";

async function updateRestaurantRatingSummary(restaurantId: string) {
  const stats = await RestaurantReview.aggregate([
    { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId) } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const total = stats.reduce((sum, stat) => sum + stat.count, 0);
  const avg =
    total === 0
      ? 0
      : stats.reduce((sum, stat) => sum + stat._id * stat.count, 0) / total;

  const distribution = Array.from({ length: 5 }, (_, index) => ({
    rating: index + 1,
    count: stats.find((stat) => stat._id === index + 1)?.count || 0,
  }));

  await Restaurant.findByIdAndUpdate(restaurantId, {
    avgRating: Number(avg.toFixed(1)),
    numReviews: total,
    ratingDistribution: distribution,
  });
}

export async function submitRestaurantReviewAction(
  values: Omit<z.infer<typeof RestaurantReviewInputSchema>, "user">,
  path: string,
): Promise<ActionState> {
  try {
    const session = await getServerSession();
    if (!session) throw new Error("Not authenticated");

    const validated = RestaurantReviewInputSchema.safeParse({
      ...values,
      user: session.user.id,
    });
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }

    const data = validated.data;

    await connectToDatabase();

    const restaurant = await Restaurant.findById(data.restaurant)
      .select("name slug status isApproved isActive")
      .lean();
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }
    if (
      restaurant.status !== "approved" ||
      !restaurant.isApproved ||
      !restaurant.isActive
    ) {
      throw new Error("Reviews are only available for active restaurants");
    }

    const existingReview = await RestaurantReview.findOne({
      restaurant: data.restaurant,
      user: data.user,
    });

    if (existingReview) {
      existingReview.title = data.title;
      existingReview.comment = data.comment;
      existingReview.rating = data.rating;
      await existingReview.save();
    } else {
      const createdReview = await RestaurantReview.create(data);
      await sendAdminEventNotification({
        title: "New restaurant review",
        description: `${session.user.name || "Customer"} rated ${restaurant.name} ${createdReview.rating}/5${createdReview.title ? ` - ${createdReview.title}` : ""}.`,
        href: "/admin/restaurants",
        meta: "Customer feedback",
        createdAt: createdReview.createdAt.toISOString(),
      });
    }

    await updateRestaurantRatingSummary(data.restaurant);
    revalidatePath(path);
    revalidatePath("/restaurants");

    if (restaurant.slug) {
      revalidatePath(`/restaurants/${restaurant.slug}`);
    }

    return { success: true, message: "Review saved" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getRestaurantReviews({
  restaurantId,
  limit,
  page,
}: {
  restaurantId: string;
  limit?: number;
  page: number;
}) {
  const {
    common: { pageSize },
  } = await getSetting();
  const pageLimit = limit || pageSize;

  await connectToDatabase();
  const skipAmount = (page - 1) * pageLimit;

  const reviews = await RestaurantReview.find({ restaurant: restaurantId })
    .populate("user", "name")
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageLimit);

  const reviewsCount = await RestaurantReview.countDocuments({
    restaurant: restaurantId,
  });
  const restaurant = await Restaurant.findById(restaurantId)
    .select("avgRating numReviews ratingDistribution")
    .lean();

  return {
    data: JSON.parse(JSON.stringify(reviews)) as IRestaurantReviewDetails[],
    totalPages: reviewsCount === 0 ? 1 : Math.ceil(reviewsCount / pageLimit),
    summary: {
      avgRating: Number(restaurant?.avgRating || 0),
      numReviews: Number(restaurant?.numReviews || 0),
      ratingDistribution: restaurant?.ratingDistribution || [],
    },
  };
}

export async function deleteRestaurantReview(id: string): Promise<ActionState> {
  try {
    const session = await getServerSession();
    if (!session) throw new Error("Not authenticated");

    await connectToDatabase();
    const review = await RestaurantReview.findById(id)
      .select("restaurant user")
      .lean();
    if (!review) throw new Error("Review not found");

    const isAdmin = canAccessAdminDashboard(session.user.role);
    const isOwner = review.user.toString() === session.user.id;

    if (!isAdmin && !isOwner) {
      throw new Error("Not authorized to delete this review");
    }

    await RestaurantReview.findByIdAndDelete(id);
    await updateRestaurantRatingSummary(review.restaurant.toString());

    const restaurant = await Restaurant.findById(review.restaurant)
      .select("slug")
      .lean();

    revalidatePath("/restaurants");
    if (restaurant?.slug) {
      revalidatePath(`/restaurants/${restaurant.slug}`);
    }

    return {
      success: true,
      message: "Review deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}
