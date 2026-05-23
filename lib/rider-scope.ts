import { connectToDatabase } from "@/lib/db";
import RiderProfile from "@/lib/db/models/rider-profile.model";
import { canStartRiderOnboarding } from "@/lib/dashboard-access";
import { getServerSession } from "@/lib/get-session";

export type RiderScope = {
  role: "RIDER";
  userId: string;
  userName: string;
  riderProfileId: string;
  riderStatus: "pending_kyc" | "active" | "suspended";
  availability: "offline" | "idle" | "on_trip";
};

export async function getRiderScope(): Promise<RiderScope> {
  await connectToDatabase();
  const session = await getServerSession();
  if (!session?.user) throw new Error("Unauthorized");

  if (!canStartRiderOnboarding(session.user.role)) throw new Error("Unauthorized");

  const riderProfile = await RiderProfile.findOne({ user: session.user.id })
    .select("_id status availability")
    .lean();
  if (!riderProfile?._id) throw new Error("Rider profile not found");

  return {
    role: "RIDER",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Rider",
    riderProfileId: riderProfile._id.toString(),
    riderStatus: riderProfile.status,
    availability: riderProfile.availability,
  };
}
