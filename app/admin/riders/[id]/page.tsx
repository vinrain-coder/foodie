import { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import {
  isAdminRole,
} from "@/lib/dashboard-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock3,
  AlertCircle,
  ArrowLeft,
  Bike,
  MapPin,
  Phone,
  User as UserIcon,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { connectToDatabase } from "@/lib/db";
import RiderProfile from "@/lib/db/models/rider-profile.model";
import User from "@/lib/db/models/user.model";
import DeliveryJob from "@/lib/db/models/delivery-job.model";
import { formatDateTime } from "@/lib/utils";
import Image from "next/image";
import { approveRiderByAdmin } from "@/lib/actions/rider-profile.actions";
import Breadcrumb from "@/components/shared/breadcrumb";

export const metadata: Metadata = {
  title: "Rider Details",
  robots: PRIVATE_ROBOTS,
};

export default async function AdminRiderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/forbidden");
  }

  const { id } = params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    notFound();
  }

  await connectToDatabase();

  const [profile, user] = await Promise.all([
    RiderProfile.findById(id).lean(),
    User.findById(id).select("name email createdAt").lean(),
  ]);

  if (!profile) {
    notFound();
  }

  const p = profile as any;
  const u = user as any;

  const statusBadge = (() => {
    if (p.isKycVerified) {
      return {
        icon: CheckCircle2,
        classes:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40",
        label: "Approved",
      };
    }
    if (p.status === "suspended") {
      return {
        icon: AlertCircle,
        classes:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40",
        label: "Suspended",
      };
    }
    return {
      icon: Clock3,
      classes:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40",
      label: "Pending KYC",
    };
  })();

  const recentJobs = await DeliveryJob.find({ rider: p.user || id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("order", "trackingNumber status expectedDeliveryDate")
    .lean();

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex items-center gap-4">
        <Link href="/admin/riders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Riders
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Bike className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {p.fullName || u?.name || "Unknown Rider"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{u?.email || "-"}</span>
              <span>·</span>
              <span>{p.phone || "-"}</span>
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`w-fit ${statusBadge.classes}`}
        >
          <statusBadge.icon className="mr-1 h-3.5 w-3.5" />
          {statusBadge.label}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Personal & Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserIcon className="h-4 w-4" /> Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-medium">{p.fullName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{u?.email || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{p.phone || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{p.location || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium">
                {p.createdAt ? formatDateTime(p.createdAt).dateTime : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bike className="h-4 w-4" /> Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium capitalize">{p.vehicleType || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacity</span>
              <span className="font-medium">{p.capacity || 0} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plate No.</span>
              <span className="font-medium">{p.plateNumber || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">License No.</span>
              <span className="font-medium">{p.licenseNumber || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">National ID</span>
              <span className="font-medium">{p.nationalIdNumber || "-"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed Jobs</span>
              <span className="font-medium">{p.completedJobs || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cancelled</span>
              <span className="font-medium">{p.cancelledJobs || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rating</span>
              <span className="font-medium">
                {Number(p.rating || 0).toFixed(1)} / 5.0
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Acceptance Rate</span>
              <span className="font-medium">
                {Number(p.acceptanceRate || 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Availability</span>
              <span className="font-medium capitalize">{p.availability || "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KYC Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> KYC Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Identity Document */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Identity Document <span className="text-xs">({p.identityVerification?.status || "missing"})</span>
              </p>
              {p.identityDocumentUrl ? (
                <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-muted/50">
                  <Image
                    src={p.identityDocumentUrl}
                    alt="Identity document"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  No document uploaded
                </div>
              )}
              {p.selfieUrl ? (
                <div className="relative h-32 w-full overflow-hidden rounded-lg border bg-muted/50">
                  <Image
                    src={p.selfieUrl}
                    alt="Selfie"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>

            {/* Vehicle Documents */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Vehicle License{" "}
                <span className="text-xs">({p.vehicleDocuments?.status || "missing"})</span>
              </p>
              {p.vehicleLicenseUrl ? (
                <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-muted/50">
                  <Image
                    src={p.vehicleLicenseUrl}
                    alt="Vehicle license"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  No document uploaded
                </div>
              )}
            </div>

            {/* Vehicle Photo */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Vehicle Photo</p>
              {p.vehiclePhotoUrl ? (
                <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-muted/50">
                  <Image
                    src={p.vehiclePhotoUrl}
                    alt="Vehicle photo"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  No photo uploaded
                </div>
              )}
            </div>
          </div>

          {p.identityVerification?.rejectionReason ? (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <span className="font-semibold">ID Document Rejection:</span>{" "}
              {p.identityVerification.rejectionReason}
            </div>
          ) : null}
          {p.vehicleDocuments?.rejectionReason ? (
            <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <span className="font-semibold">Vehicle Document Rejection:</span>{" "}
              {p.vehicleDocuments.rejectionReason}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Delivery Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No delivery jobs assigned yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map((job: any) => (
                  <TableRow key={job._id.toString()}>
                    <TableCell className="font-mono text-xs">
                      {job.order?.trackingNumber || "-"}
                    </TableCell>
                    <TableCell className="capitalize">{job.state}</TableCell>
                    <TableCell>
                      {job.order?.expectedDeliveryDate
                        ? formatDateTime(job.order.expectedDeliveryDate).dateTime
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admin Action */}
      {!p.isKycVerified && p.status !== "suspended" && (
        <form
          action={async (formData) => {
            "use server";
            const approve = formData.get("action") === "approve";
            const reason = String(formData.get("reason") || "");
            await approveRiderByAdmin({
              riderUserId: p.user?.toString() || id,
              approved: approve,
              rejectionReason: reason,
            });
          }}
          className="space-y-4"
        >
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Admin Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                name="reason"
                placeholder={
                  "Required if rejecting — explain what needs to be corrected or reason for rejection"
                }
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  name="action"
                  value="approve"
                  className="inline-flex gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Activate
                </Button>
                <Button
                  type="submit"
                  name="action"
                  value="reject"
                  variant="destructive"
                  className="inline-flex gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
