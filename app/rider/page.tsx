import type { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { isRiderRole } from "@/lib/dashboard-access";
import { getRiderProfile, getRiderRegistrationStatus } from "@/lib/actions/rider-profile.actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bike,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  AlertCircle,
  User,
} from "lucide-react";

interface RiderDashboardData {
  profile: {
    _id: string;
    status: string;
    fullName: string;
    availability: string;
    vehicleType: string;
    capacity: number;
    phone: string;
    location: string;
    completedJobs: number;
    rating: number;
    acceptanceRate: number;
    isKycVerified: boolean;
  } | null;
  registrationStatus: {
    exists: boolean;
    status?: string;
    adminNote?: string;
  };
}

export const metadata: Metadata = {
  title: "Rider Dashboard",
  robots: PRIVATE_ROBOTS,
};

export default async function RiderDashboardPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/rider/jobs");
  }
  if (!isRiderRole(session.user.role)) {
    redirect("/forbidden");
  }

  const profileResult = await getRiderProfile();
  const statusResult = await getRiderRegistrationStatus();

  const profile = profileResult.success && profileResult.data ? (profileResult.data as any) : null;
  const registration: any = statusResult;

  const isApproved = registration.exists && registration.status === "active";
  const isPending = registration.exists && registration.status === "pending_kyc";
  const noProfile = !registration.exists;

  let statusBadge: any;
  if (isApproved) {
    statusBadge = {
      icon: CheckCircle2,
      classes:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
      label: "Active & Verified",
    };
  } else if (isPending) {
    statusBadge = {
      icon: Clock3,
      classes:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
      label: "KYC Pending Review",
    };
  } else if (noProfile) {
    statusBadge = {
      icon: FileText,
      classes:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
      label: "Not Registered",
    };
  } else {
    statusBadge = {
      icon: AlertCircle,
      classes:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
      label: "Action Required",
    };
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {statusBadge && (
        <div
          className={`flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusBadge.classes}`}
        >
          <statusBadge.icon className="h-4 w-4" />
          <span>{statusBadge.label}</span>
        </div>
      )}

      {/* Not Registered → CTA */}
      {noProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bike className="h-5 w-5 text-primary" />
              </span>
              Become a Rider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Join our delivery network. Complete your KYC registration once and
              start accepting delivery jobs near you.
            </p>
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <p className="font-medium">1. Register</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Vehicle type, license, ID
                  </p>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <p className="font-medium">2. Get Verified</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Admin reviews your KYC
                  </p>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <p className="font-medium">3. Start Earning</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Accept delivery job offers
                  </p>
                </CardContent>
              </Card>
            </div>
            <Link href="/rider-signup">
              <Button>
                Start Registration
                <FileText className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pending */}
      {isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </span>
              Application Under Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Your KYC documents are being verified. This usually takes 24–48
              hours. You'll receive a notification once the review is complete.
            </p>
            {registration.adminNote && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <span className="font-semibold">Latest update: </span>
                {registration.adminNote}
              </div>
            )}
            <Link href="/rider/profile">
              <Button variant="outline">View Profile Status</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Active Rider */}
      {isApproved && (
        <>
          {/* Welcome + Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Full Name</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold">
                    {registration.fullName || "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Phone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">
                  {registration.phone || "-"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold capitalize">
                  {registration.vehicleType || "-"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold truncate">
                    {registration.location || "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {profile?.completedJobs || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Completed deliveries
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Number(profile?.rating || 0).toFixed(1)} / 5.0
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Average rating
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Number(profile?.acceptanceRate || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Acceptance rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
