import { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { toSignInPath } from "@/lib/redirects";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { isAdminRole } from "@/lib/dashboard-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Breadcrumb from "@/components/shared/breadcrumb";
import { connectToDatabase } from "@/lib/db";
import RiderProfile from "@/lib/db/models/rider-profile.model";
import RidersManagementClient from "./riders-management-client";

export const metadata: Metadata = {
  title: "Rider Management",
  robots: PRIVATE_ROBOTS,
};

type RiderListItem = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  vehicleType: string;
  location: string;
  status: string;
  isKycVerified: boolean;
  availability: string;
  completedJobs: number;
  rating: number;
  acceptanceRate: number;
  kycVerifiedAt?: string;
  createdAt: string;
};

export default async function AdminRidersPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(toSignInPath("/admin/riders"));
  }
  if (!isAdminRole(session.user.role)) {
    redirect("/forbidden");
  }

  await connectToDatabase();
  const riders = await RiderProfile.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "name email")
    .lean();

  const riderList: RiderListItem[] = riders.map((r: any) => ({
    _id: r._id.toString(),
    userId: (r.user as any)?._id?.toString?.() || "",
    fullName: r.fullName || (r.user as any)?.name || "Unknown",
    email: (r.user as any)?.email || "",
    phone: r.phone || "",
    vehicleType: r.vehicleType || "motorbike",
    location: (r as any).location || "",
    status: r.status,
    isKycVerified: r.isKycVerified,
    availability: r.availability,
    completedJobs: r.completedJobs || 0,
    rating: r.rating || 5,
    acceptanceRate: r.acceptanceRate || 0,
    kycVerifiedAt: r.kycVerifiedAt?.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  const activeCount = riderList.filter((r) => r.isKycVerified).length;
  const pendingCount = riderList.filter(
    (r) => !r.isKycVerified && r.status !== "suspended",
  ).length;
  const suspendedCount = riderList.filter((r) => r.status === "suspended").length;

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1-bold">Rider Management</h1>
          <p className="text-muted-foreground">
            Manage rider applications, KYC reviews, profile approvals.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Total riders: <strong className="text-foreground">{riderList.length}</strong>{" "}
          | Active: <strong className="text-emerald-600 dark:text-emerald-400">{activeCount}</strong>{" "}
          | Pending: <strong className="text-amber-600 dark:text-amber-400">{pendingCount}</strong>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Riders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </p>
            <p className="text-xs text-muted-foreground">
              KYC verified and eligible for jobs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingCount}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting admin review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {suspendedCount}
            </p>
            <p className="text-xs text-muted-foreground">
              Account suspended or deactivated
            </p>
          </CardContent>
        </Card>
      </div>

      <RidersManagementClient riders={riderList} />
    </div>
  );
}

