import { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { toSignInPath } from "@/lib/redirects";
import Link from "next/link";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { isAdminRole } from "@/lib/dashboard-access";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Breadcrumb from "@/components/shared/breadcrumb";
import { connectToDatabase } from "@/lib/db";
import RiderProfile from "@/lib/db/models/rider-profile.model";
import User from "@/lib/db/models/user.model";
import {
  formatDateTime,
  formatNumberWithDecimal,
} from "@/lib/utils";
import { Clock3, CheckCircle2, AlertCircle, Eye, User as UserIcon } from "lucide-react";

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

function statusBadge(status: string, isKycVerified: boolean) {
  if (isKycVerified) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40"
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge
        variant="outline"
        className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Suspended
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40"
    >
      <Clock3 className="mr-1 h-3 w-3" />
      Pending KYC
    </Badge>
  );
}

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
  const pendingCount = riderList.filter((r) => !r.isKycVerified && r.status !== "suspended").length;
  const suspendedCount = riderList.filter((r) => r.status === "suspended").length;

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1-bold">Rider Management</h1>
          <p className="text-muted-foreground">
            Manage rider applications, KYC reviews, and profile approvals.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Total riders: <strong className="text-foreground">{riderList.length}</strong>{" "}
          · Active: <strong className="text-emerald-600 dark:text-emerald-400">{activeCount}</strong>{" "}
          · Pending: <strong className="text-amber-600 dark:text-amber-400">{pendingCount}</strong>
        </p>
      </div>

      {/* Summary Cards */}
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
            <p className="text-xs text-muted-foreground">
              Awaiting admin review
            </p>
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

      {/* Riders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rider Directory</CardTitle>
          <CardDescription>
            All registered riders — click a row to view profile and review KYC
          </CardDescription>
        </CardHeader>
        <CardContent>
          {riderList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <UserIcon className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">No riders registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riderList.map((rider) => (
                    <TableRow key={rider._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rider.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {rider.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{rider.phone || "-"}</TableCell>
                      <TableCell className="capitalize">
                        {rider.vehicleType}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {rider.location || "-"}
                      </TableCell>
                      <TableCell>
                        {statusBadge(rider.status, rider.isKycVerified)}
                      </TableCell>
                      <TableCell>{rider.completedJobs}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            rider.rating >= 4
                              ? "default"
                              : rider.rating >= 3
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {Number(rider.rating).toFixed(1)} / 5
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-8"
                        >
                          <Link href={`/admin/riders/${rider.userId || rider._id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
