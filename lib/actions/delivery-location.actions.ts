"use server";

import { connectToDatabase } from "../db";
import DeliveryLocation, { IDeliveryLocation } from "../db/models/delivery-location.model";
import { DeliveryLocationInputSchema, DeliveryLocationUpdateSchema } from "../validator";
import { escapeRegExp, flattenZodErrors, formatError } from "../utils";
import { ActionState } from "@/types/action-state";
import { revalidateTag } from "next/cache";
import { cacheLife, cacheTag } from "next/cache";
import { getServerSession } from "../get-session";
import { getSetting } from "./setting.actions";
import { canAccessAdminDashboard } from "@/lib/dashboard-access";

export type SerializedDeliveryLocation = Omit<IDeliveryLocation, "_id"> & { _id: string };

const serializeDeliveryLocation = (location: IDeliveryLocation): SerializedDeliveryLocation => {
  return JSON.parse(JSON.stringify(location));
};

export async function getAllDeliveryLocations({
  query,
  limit,
  page = 1,
  county = "all",
}: {
  query?: string;
  limit?: number;
  page?: number;
  county?: string;
}) {
  "use cache";
  cacheLife("minutes");
  cacheTag("delivery-locations");

  await connectToDatabase();

  const {
    common: { pageSize },
  } = await getSetting();
  limit = limit || pageSize || 20;

  const skipAmount = (Number(page) - 1) * limit;

   
  const filter: any = {};

  if (query) {
    filter.$or = [
      { county: { $regex: escapeRegExp(query), $options: "i" } },
      { city: { $regex: escapeRegExp(query), $options: "i" } },
    ];
  }

  if (county && county !== "all") {
    filter.county = county;
  }

  const locations = await DeliveryLocation.find(filter)
    .sort({ county: 1, city: 1 })
    .skip(skipAmount)
    .limit(limit)
    .lean();

  const totalLocations = await DeliveryLocation.countDocuments(filter);

  return {
    data: locations.map((loc) => serializeDeliveryLocation(loc as any)),
    totalPages: Math.ceil(totalLocations / limit),
    totalLocations,
  };
}

export async function getDeliveryLocationById(id: string) {
  await connectToDatabase();
  const location = await DeliveryLocation.findById(id).lean();
  return location ? serializeDeliveryLocation(location as any) : null;
}

export async function createDeliveryLocation(data: any): Promise<ActionState> {
  try {
    const session = await getServerSession();
    if (!canAccessAdminDashboard(session?.user?.role)) {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const validated = DeliveryLocationInputSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }
    const validatedData = validated.data;

    const newLocation = await DeliveryLocation.create(validatedData);
    revalidateTag("delivery-locations", "max");

    return {
      success: true,
      message: "Delivery location created successfully",
      data: serializeDeliveryLocation(newLocation),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function createDeliveryLocationsBulk(data: {
  county: string;
  places: Array<{ city: string; rate: number }>;
}) {
  try {
    const session = await getServerSession();
    if (!canAccessAdminDashboard(session?.user?.role)) {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const county = data.county?.trim();
    if (!county) throw new Error("County is required");

    const normalizedPlaces = (data.places || [])
      .map((place) => ({
        city: place.city?.trim(),
        rate: Number(place.rate),
      }))
      .filter((place) => place.city && Number.isFinite(place.rate));

    if (!normalizedPlaces.length) {
      throw new Error("Add at least one valid place and rate");
    }

     const validatedPlaces: any[] = [];
     const validationErrors: Record<string, string[]> = {};

     for (const place of normalizedPlaces) {
       const validated = DeliveryLocationInputSchema.safeParse({
         county,
         city: place.city,
         rate: place.rate,
       });
       if (!validated.success) {
         const fieldErrors = flattenZodErrors(validated.error);
         if (fieldErrors) {
           Object.entries(fieldErrors).forEach(([field, messages]) => {
             if (!validationErrors[field]) {
               validationErrors[field] = [];
             }
             validationErrors[field].push(`For ${place.city}: ${messages.join(", ")}`);
           });
         }
       } else {
         validatedPlaces.push(validated.data);
       }
     }

     if (validatedPlaces.length === 0) {
       return {
         success: false,
         message: "Validation failed",
         errors: validationErrors,
       };
     }

     await DeliveryLocation.insertMany(validatedPlaces);
     revalidateTag("delivery-locations", "max");

     return {
       success: true,
       message: `${validatedPlaces.length} delivery location${validatedPlaces.length > 1 ? "s" : ""} created successfully`,
     };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateDeliveryLocation(data: any): Promise<ActionState> {
  try {
    const session = await getServerSession();
    if (!canAccessAdminDashboard(session?.user?.role)) {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const validated = DeliveryLocationUpdateSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }
    const validatedData = validated.data;

    const updatedLocation = await DeliveryLocation.findByIdAndUpdate(
      validatedData._id,
      validatedData,
      { new: true }
    );

    if (!updatedLocation) throw new Error("Location not found");
    revalidateTag("delivery-locations", "max");

    return {
      success: true,
      message: "Delivery location updated successfully",
      data: serializeDeliveryLocation(updatedLocation),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deleteDeliveryLocation(id: string) {
  try {
    const session = await getServerSession();
    if (!canAccessAdminDashboard(session?.user?.role)) {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const deletedLocation = await DeliveryLocation.findByIdAndDelete(id);

    if (!deletedLocation) throw new Error("Location not found");
    revalidateTag("delivery-locations", "max");

    return {
      success: true,
      message: "Delivery location deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getDeliveryLocationStats() {
  "use cache";
  cacheLife("minutes");
  cacheTag("delivery-locations");

  await connectToDatabase();

  const totalLocations = await DeliveryLocation.countDocuments();
  const countiesCount = await DeliveryLocation.distinct("county").then(
    (counties) => counties.length
  );

  const avgRateResult = await DeliveryLocation.aggregate([
    {
      $group: {
        _id: null,
        avgRate: { $avg: "$rate" },
      },
    },
  ]);

  const avgRate = avgRateResult[0]?.avgRate || 0;

  return {
    totalLocations,
    countiesCount,
    avgRate,
  };
}

export async function getAllCounties() {
  "use cache";
  cacheLife("hours");
  cacheTag("delivery-locations");

  await connectToDatabase();
  const counties = await DeliveryLocation.distinct("county");
  return (counties as string[]).sort();
}

export async function getPlacesByCounty(county: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("delivery-locations");

  await connectToDatabase();
  const places = await DeliveryLocation.find({ county })
    .select("city rate")
    .sort({ city: 1 })
    .lean();

  return (places as any[]).map(p => ({
    city: p.city,
    rate: p.rate
  }));
}
