import { connectToDatabase } from "@/lib/db";
import Restaurant from "@/lib/db/models/restaurant.model";
import { getServerSession } from "@/lib/get-session";
import {
  canAccessAdminDashboard,
  isAdminRole,
  isRestaurantRole,
} from "@/lib/dashboard-access";

export type StaffScope =
  | {
      role: "ADMIN";
      userId: string;
      userName: string;
      restaurantId: null;
    }
  | {
      role: "RESTAURANT";
      userId: string;
      userName: string;
      restaurantId: string;
    };

export async function getStaffScope(): Promise<StaffScope> {
  await connectToDatabase();
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!canAccessAdminDashboard(session.user.role)) {
    throw new Error("Unauthorized");
  }

  if (isAdminRole(session.user.role)) {
    return {
      role: "ADMIN",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Admin",
      restaurantId: null,
    };
  }

  if (!isRestaurantRole(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const restaurant = await Restaurant.findOne({
    ownerId: session.user.id,
    status: "approved",
    isApproved: true,
    isActive: true,
  })
    .select("_id")
    .lean();

  if (!restaurant?._id) {
    throw new Error(
      "Restaurant account is not active. Please complete and get approval for your restaurant profile.",
    );
  }

  return {
    role: "RESTAURANT",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Restaurant",
    restaurantId: restaurant._id.toString(),
  };
}
