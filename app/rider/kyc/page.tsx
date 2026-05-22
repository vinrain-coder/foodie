"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
} from "lucide-react";
import Breadcrumb from "@/components/shared/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function RiderKycPage() {
  const [profileData, setProfileData] = useState<
    | {
        identityDocumentUrl: string;
        selfieUrl: string;
        vehicleLicenseUrl: string;
        vehicleInsuranceUrl: string;
        vehiclePhotoUrl: string;
        status: string;
        isKycVerified: boolean;
        kycRejectedReason: string;
      }
    | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { getRiderProfile } = await import("@/lib/actions/rider-profile.actions");
      const result = await getRiderProfile();
      if (result.success && result.data) {
        const d = result.data as any;
        setProfileData({
          identityDocumentUrl: d.identityDocumentUrl || "",
          selfieUrl: d.selfieUrl || "",
          vehicleLicenseUrl: d.vehicleLicenseUrl || "",
          vehicleInsuranceUrl: d.vehicleInsuranceUrl || "",
          vehiclePhotoUrl: d.vehiclePhotoUrl || "",
          status: d.status || "pending_kyc",
          isKycVerified: d.isKycVerified || false,
          kycRejectedReason: d.kycRejectedReason || "",
        });
      }
      setIsLoading(false);
    }
    fetch();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div>
        <h1 className="h1-bold">Compliance & KYC</h1>
        <p className="text-muted-foreground">
          Check the status of your identity and vehicle documents.
        </p>
      </div>

      {/* Status Banner */}
      {profileData?.isKycVerified ? (
        <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="pt-6 space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              KYC Verified
            </div>
            <p className="text-emerald-700 dark:text-emerald-300">
              Your identity and vehicle documents have been verified. You are
              eligible to go online and accept delivery jobs.
            </p>
          </CardContent>
        </Card>
      ) : profileData?.status === "pending_kyc" ? (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="pt-6 space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <Clock3 className="h-5 w-5" />
              Verification Pending
            </div>
            <p className="text-amber-700 dark:text-amber-300">
              Your documents are under review. This typically takes 24–48 hours.
            </p>
            {profileData?.kycRejectedReason ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <span className="font-semibold">Feedback:</span> {profileData.kycRejectedReason}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-300/60 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30">
          <CardContent className="pt-6 space-y-2 text-sm text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5" />
              Documents Required
            </div>
            <p>
              Submit your rider registration to upload identity and vehicle
              documents.
            </p>
            <Link href="/rider-signup" className="mt-2 inline-flex">
              <Button>Go to Registration</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Identity Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Identity Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="text-sm text-muted-foreground">
            Your submitted identity documents and selfie.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DocPreview
              label="National ID / Identity Document"
              url={profileData?.identityDocumentUrl}
            />
            <DocPreview
              label="Selfie / Profile Photo"
              url={profileData?.selfieUrl}
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Vehicle Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="text-sm text-muted-foreground">
            Your submitted vehicle license and photo.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DocPreview
              label="Vehicle License / Registration"
              url={profileData?.vehicleLicenseUrl}
            />
            <DocPreview
              label="Vehicle Photo"
              url={profileData?.vehiclePhotoUrl}
            />
          </div>
          <DocPreview
            label="Vehicle Insurance (optional)"
            url={profileData?.vehicleInsuranceUrl}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/rider/profile">
          <Button variant="outline">Back to Profile</Button>
        </Link>
      </div>
    </div>
  );
}

function DocPreview({
  label,
  url,
}: {
  label: string;
  url?: string;
}) {
  if (!url) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium">{label}</p>
        <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No document uploaded
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-muted/50">
        <Image
          src={url}
          alt={label}
          fill
          unoptimized
          className="object-contain"
        />
      </div>
    </div>
  );
}
