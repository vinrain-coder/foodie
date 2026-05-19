"use server";

import { connectToDatabase } from "@/lib/db";
import Coupon, { ICoupon } from "@/lib/db/models/coupon.model";
import { revalidatePath } from "next/cache";
import { formatError, escapeRegExp, flattenZodErrors } from "../utils";
import { CouponInputSchema, CouponUpdateSchema } from "../validator";
import { ActionState } from "@/types/action-state";
import Affiliate from "../db/models/affiliate.model";
import { getSetting } from "./setting.actions";
import { ICouponInput } from "@/types";
import { z } from "zod";
import mongoose from "mongoose";
import { canUseCoupon, UserSession } from "../coupons/access-control";
import { getServerSession } from "../get-session";
import Order from "../db/models/order.model";

const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

// CREATE COUPON
export async function createCoupon(data: ICouponInput): Promise<ActionState> {
  try {
    const validated = CouponInputSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }
    const coupon = validated.data;
    await connectToDatabase();

    const existingCoupon = await Coupon.findOne({
      code: normalizeCouponCode(coupon.code),
    });
    if (existingCoupon) throw new Error("Coupon code already exists.");

    await Coupon.create({ ...coupon, code: normalizeCouponCode(coupon.code) });
    revalidatePath("/admin/coupons");
    return { success: true, message: "Coupon created successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// UPDATE COUPON
export async function updateCoupon(
  data: z.infer<typeof CouponUpdateSchema>,
): Promise<ActionState> {
  try {
    const validated = CouponUpdateSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }
    const coupon = validated.data;
    await connectToDatabase();

    const existingCoupon = await Coupon.findOne({
      code: normalizeCouponCode(coupon.code),
      _id: { $ne: coupon._id },
    });
    if (existingCoupon) throw new Error("Coupon code already exists.");

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      coupon._id,
      {
        ...coupon,
        code: normalizeCouponCode(coupon.code),
      },
      {
        new: true,
      },
    );
    if (!updatedCoupon) throw new Error("Coupon not found.");

    revalidatePath("/admin/coupons");
    return { success: true, message: "Coupon updated successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// DELETE COUPON
export async function deleteCoupon(id: string) {
  try {
    await connectToDatabase();
    const res = await Coupon.findByIdAndDelete(id);
    if (!res) throw new Error("Coupon not found.");

    revalidatePath("/admin/coupons");
    return { success: true, message: "Coupon deleted successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// GET SINGLE COUPON BY ID
export async function getCouponById(id: string) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new Error("Invalid coupon ID");

  const coupon = await Coupon.findById(id);
  if (!coupon) throw new Error("Coupon not found.");

  return JSON.parse(JSON.stringify(coupon)) as ICoupon;
}

// GET ALL COUPONS WITH FILTERING & PAGINATION
// If tiers is provided (e.g. ["free"]), only coupons in those tiers are returned.
// If tiers is not provided, all published coupons are returned (admin use).
export async function getAllCoupons({
  query,
  page = 1,
  sort = "latest",
  limit = 10,
  from,
  to,
  tier,
  tiers, // New: array of tiers to filter (e.g. ["free"])
}: {
  query?: string;
  page?: number;
  sort?: string;
  limit?: number;
  from?: string;
  to?: string;
  tier?: string;
  tiers?: string[];
}) {
  await connectToDatabase();

  const queryFilter: any = query
    ? {
        code: { $regex: escapeRegExp(query), $options: "i" },
      }
    : {};

  if (tier) {
    queryFilter.tier = tier;
  }

  if (tiers && tiers.length > 0) {
    queryFilter.tier = { $in: tiers };
  }

  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if (
      (fromDate && !isNaN(fromDate.getTime())) ||
      (toDate && !isNaN(toDate.getTime()))
    ) {
      queryFilter.createdAt = {};
      if (fromDate && !isNaN(fromDate.getTime()))
        queryFilter.createdAt.$gte = fromDate;
      if (toDate && !isNaN(toDate.getTime()))
        queryFilter.createdAt.$lte = toDate;
    }
  }

  const order: Record<string, 1 | -1> =
    sort === "discount-high-to-low"
      ? { discountValue: -1 }
      : sort === "discount-low-to-high"
        ? { discountValue: 1 }
        : { createdAt: -1 };

  const coupons = await Coupon.find(queryFilter)
    .sort(order)
    .skip(limit * (page - 1))
    .limit(limit)
    .lean();

  const totalCoupons = await Coupon.countDocuments(queryFilter);

  return {
    coupons: JSON.parse(JSON.stringify(coupons)) as unknown as ICoupon[],
    totalPages: Math.ceil(totalCoupons / limit),
    totalCoupons,
    from: (page - 1) * limit + 1, // 🟢 Ensure `from` exists
    to: Math.min(page * limit, totalCoupons), // 🟢 Ensure `to` exists
  };
}

// GET ALL PUBLISHED COUPONS (respects tier filtering based on user status)
// If a user is provided: free-tier users only see "free" coupons; premium/admin see all.
// If no user is provided (unauthenticated guest), only "free" coupons are returned.
export async function getPublishedCoupons(user?: UserSession | null) {
  await connectToDatabase();

  const filter: Record<string, any> = { isPublished: true };

  // If no user or user is on FREE tier, only show free coupons
  if (!user || user.subscription === "FREE") {
    filter.tier = "free";
  }
  // Premium users / admins see all published coupons

  const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).lean();

  return JSON.parse(JSON.stringify(coupons)) as ICoupon[];
}

// GET COUPONS FOR GUEST USERS — only free & published coupons
export async function getGuestCoupons() {
  await connectToDatabase();

  const coupons = await Coupon.find({
    isPublished: true,
    tier: "free",
  })
    .sort({ createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(coupons)) as ICoupon[];
}

export async function validateCoupon(code: string, itemsTotal: number) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    const user = session?.user as UserSession;

    const normalizedCode = normalizeCouponCode(code || "");
    if (!normalizedCode)
      return { success: false, message: "Enter a coupon code." };

    const coupon = await Coupon.findOne({
      code: normalizedCode,
      isPublished: true,
    });

    if (coupon) {
      // Access Control Check
      const access = canUseCoupon(user || null, coupon);
      if (typeof access === "object" && !access.allowed) {
        return { success: false, message: access.reason };
      }

      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        return {
          success: false,
          message: `The coupon code "${code}" has expired.`,
        };
      }
      if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
        return {
          success: false,
          message: `The coupon code "${code}" has reached its maximum usage limit.`,
        };
      }

      // User-specific usage limit
      if (user && coupon.usageLimitPerUser) {
        const userUsageCount = await Order.countDocuments({
          user: user.id,
          "coupon._id": coupon._id,
          status: { $ne: "cancelled" },
        });

        if (userUsageCount >= coupon.usageLimitPerUser) {
          return {
            success: false,
            message:
              "You have reached your personal usage limit for this coupon.",
          };
        }
      }

      if (coupon.minPurchase && itemsTotal < coupon.minPurchase) {
        return {
          success: false,
          message: `Minimum purchase of ${coupon.minPurchase} is required for this coupon.`,
        };
      }

      let discount = 0;
      if (coupon.discountType === "percentage") {
        discount = ((coupon.discountValue || 0) / 100) * (itemsTotal || 0);
      } else {
        discount = coupon.discountValue || 0;
      }

      const normalizedDiscount = Math.min(
        Number(Number(discount).toFixed(2)),
        itemsTotal || 0,
      );

      return {
        success: true,
        message: "Coupon applied successfully",
        data: {
          coupon: {
            _id: (coupon._id || "").toString(),
            code: coupon.code || "",
            discountType: coupon.discountType || "percentage",
            discountValue: Number(coupon.discountValue) || 0,
            discountAmount: Number(normalizedDiscount) || 0,
          },
          discount: Number(normalizedDiscount) || 0,
          newTotal: Math.max(
            Number(Number((itemsTotal || 0) - normalizedDiscount).toFixed(2)),
            0,
          ),
        },
      };
    }

    // If not a regular coupon, check if it's an affiliate code
    const affiliate = await Affiliate.findOne({
      affiliateCode: normalizedCode,
      status: "approved",
    });

    if (affiliate) {
      const settings = await getSetting();
      if (!settings?.affiliate?.enabled) {
        return {
          success: false,
          message: "Affiliate program is currently disabled.",
        };
      }

      const discountRate =
        affiliate.discountRate !== undefined
          ? affiliate.discountRate
          : settings.affiliate.defaultDiscountRate;

      const discount = ((discountRate || 0) / 100) * (itemsTotal || 0);
      const normalizedDiscount = Math.min(
        Number(Number(discount).toFixed(2)),
        itemsTotal || 0,
      );

      return {
        success: true,
        message: "Affiliate code applied successfully",
        data: {
          coupon: {
            _id: (affiliate._id || "").toString(),
            code: affiliate.affiliateCode || "",
            discountType: "percentage",
            discountValue: Number(discountRate) || 0,
            discountAmount: Number(normalizedDiscount) || 0,
            isAffiliate: true,
          },
          discount: Number(normalizedDiscount) || 0,
          newTotal: Math.max(
            Number(Number((itemsTotal || 0) - normalizedDiscount).toFixed(2)),
            0,
          ),
        },
      };
    }

    return {
      success: false,
      message: `The coupon code "${code}" is invalid or expired.`,
    };
  } catch (error) {
    console.error("validateCoupon error:", error);
    return { success: false, message: formatError(error) };
  }
}

export async function incrementCouponUsage(couponId: string) {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(couponId)) {
    throw new Error("Invalid coupon ID");
  }

  const updatedCoupon = await Coupon.findByIdAndUpdate(
    couponId,
    { $inc: { usageCount: 1 } },
    { new: true },
  );

  if (!updatedCoupon) throw new Error("Coupon not found.");

  revalidatePath("/admin/coupons");

  return JSON.parse(JSON.stringify(updatedCoupon)) as ICoupon;
}

export async function getCouponStats() {
  await connectToDatabase();

  const now = new Date();
  const [totalCoupons, activeCoupons, expiredCoupons] = await Promise.all([
    Coupon.countDocuments(),
    Coupon.countDocuments({
      isPublished: true,
      $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }],
    }),
    Coupon.countDocuments({
      expiryDate: { $lt: now },
    }),
  ]);

  return {
    totalCoupons,
    activeCoupons,
    expiredCoupons,
  };
}

export async function decrementCouponUsage(couponId: string) {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(couponId)) {
    throw new Error("Invalid coupon ID");
  }

  const updatedCoupon = await Coupon.findOneAndUpdate(
    { _id: couponId, usageCount: { $gt: 0 } },
    { $inc: { usageCount: -1 } },
    { new: true },
  );

  revalidatePath("/admin/coupons");

  return updatedCoupon
    ? (JSON.parse(JSON.stringify(updatedCoupon)) as ICoupon)
    : null;
}
