"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import {
  Controller,
  FormProvider,
  type Resolver,
  useForm,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin,
  Bike,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import Breadcrumb from "@/components/shared/breadcrumb";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  updateRiderProfile,
  getRiderProfile,
} from "@/lib/actions/rider-profile.actions";
import Link from "next/link";

const ProfileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(120, "Name is too long"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long"),
  location: z
    .string()
    .trim()
    .min(5, "Location is required")
    .max(300, "Location is too long"),
  vehicleType: z.enum(["bicycle", "motorbike", "car", "van"]),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Minimum capacity is 1")
    .max(10, "Maximum capacity is 10"),
  plateNumber: z
    .string()
    .trim()
    .max(30, "Plate number is too long")
    .optional()
    .or(z.literal("")),
  licenseNumber: z
    .string()
    .trim()
    .min(3, "License number is required")
    .max(50, "License number is too long"),
});

type ProfileFormValues = z.infer<typeof ProfileUpdateSchema>;

const defaultValues: ProfileFormValues = {
  fullName: "",
  phone: "",
  location: "",
  vehicleType: "motorbike",
  capacity: 1,
  plateNumber: "",
  licenseNumber: "",
};

export default function RiderProfilePage() {
  const [profileData, setProfileData] = useState<
    | {
        fullName: string;
        phone: string;
        location: string;
        vehicleType: string;
        capacity: number;
        plateNumber: string;
        licenseNumber: string;
        nationalIdNumber: string;
        identityDocumentUrl: string;
        selfieUrl: string;
        vehicleLicenseUrl: string;
        vehicleInsuranceUrl: string;
        vehiclePhotoUrl: string;
        status: string;
        availability: string;
        isKycVerified: boolean;
        kycRejectedReason: string;
        kycVerifiedAt?: string;
        completedJobs: number;
        rating: number;
        acceptanceRate: number;
      }
    | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileUpdateSchema) as Resolver<ProfileFormValues>,
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const result = await getRiderProfile();
        if (result.success && result.data) {
          const d = result.data as any;
          const pData = {
            fullName: d.fullName || "",
            phone: d.phone || "",
            location: d.location || "",
            vehicleType: d.vehicleType || "motorbike",
            capacity: d.capacity || 1,
            plateNumber: d.plateNumber || "",
            licenseNumber: d.licenseNumber || "",
            nationalIdNumber: d.nationalIdNumber || "",
            identityDocumentUrl: d.identityDocumentUrl || "",
            selfieUrl: d.selfieUrl || "",
            vehicleLicenseUrl: d.vehicleLicenseUrl || "",
            vehicleInsuranceUrl: d.vehicleInsuranceUrl || "",
            vehiclePhotoUrl: d.vehiclePhotoUrl || "",
            status: d.status || "pending_kyc",
            availability: d.availability || "offline",
            isKycVerified: d.isKycVerified || false,
            kycRejectedReason: d.kycRejectedReason || "",
            kycVerifiedAt: d.kycVerifiedAt || "",
            completedJobs: d.completedJobs || 0,
            rating: d.rating || 5,
            acceptanceRate: d.acceptanceRate || 0,
          };

          if (pData.fullName !== undefined) {
            setProfileData(pData);
            form.reset({
              fullName: pData.fullName,
              phone: pData.phone,
              location: pData.location,
              vehicleType: pData.vehicleType as any,
              capacity: pData.capacity,
              plateNumber: pData.plateNumber,
              licenseNumber: pData.licenseNumber,
            });
          }
        } else if (!result.success && result.message === "Rider profile not found") {
          redirect("/rider-signup");
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [form]);

  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    const result = await updateRiderProfile(values);
    setIsSubmitting(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  const statusBadge = (() => {
    if (!profileData) return null;
    const s = profileData.status;
    if (s === "active") {
      return {
        icon: CheckCircle2,
        variant: "bg-emerald-100 text-emerald-700 border-emerald-200",
        label: "Active",
      } as const;
    }
    if (s === "suspended") {
      return {
        icon: AlertCircle,
        variant: "bg-red-100 text-red-700 border-red-200",
        label: "Suspended",
      } as const;
    }
    return {
      icon: Clock3,
      variant: "bg-amber-100 text-amber-700 border-amber-200",
      label: "Pending KYC",
    } as const;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const p = profileData;

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div>
        <h1 className="h1-bold">My Profile</h1>
        <p className="text-muted-foreground">
          View and manage your rider profile details.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bike className="h-5 w-5 text-primary" />
            </span>
            Rider Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            {statusBadge && (
              <Badge variant="outline" className={statusBadge.variant}>
                <statusBadge.icon className="mr-1 h-3.5 w-3.5" />
                {statusBadge.label}
              </Badge>
            )}
            <span className="text-muted-foreground capitalize">
              Availability: {p?.availability}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Completed Jobs</p>
              <p className="text-lg font-semibold">{p?.completedJobs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
              <p className="text-lg font-semibold">
                {Number(p?.rating || 0).toFixed(1)} / 5.0
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Acceptance Rate</p>
              <p className="text-lg font-semibold">
                {Number(p?.acceptanceRate || 0).toFixed(1)}%
              </p>
            </div>
          </div>

          {!p?.isKycVerified && p?.status === "pending_kyc" && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              Your KYC is being reviewed. You can still update basic profile
              details while waiting.
            </div>
          )}

          {p?.status === "pending_kyc" && p?.kycRejectedReason ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <p className="font-semibold">Previous submission needs correction</p>
              <p className="mt-1">{p.kycRejectedReason}</p>
              <p className="mt-2">
                Update your details and documents from{" "}
                <Link href="/rider-signup" className="underline underline-offset-4">
                  rider signup
                </Link>{" "}
                and resubmit.
              </p>
            </div>
          ) : null}

          {p?.status === "active" ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <p className="font-semibold">Rider account approved</p>
              <p className="mt-1">
                Your KYC has been approved and your account is active.
                {p.kycVerifiedAt
                  ? ` Verified on ${new Date(p.kycVerifiedAt).toLocaleString()}.`
                  : ""}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Full Name</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        placeholder="John Doe"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Phone Number</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        placeholder="+254 7XX XXX XXX"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="vehicleType"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Vehicle Type</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={(val) =>
                          field.onChange(val as any)
                        }
                      >
                        <SelectTrigger
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bicycle">Bicycle</SelectItem>
                          <SelectItem value="motorbike">
                            Motorbike
                          </SelectItem>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="capacity"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Max Delivery Capacity</FieldLabel>
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        max={20}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="plateNumber"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Plate Number (optional)</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        placeholder="e.g. KCA 123A"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="licenseNumber"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Driver's License Number</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        placeholder="DL-12345678"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="location"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Trading Area / Location</FieldLabel>
                    <Textarea
                      {...field}
                      aria-invalid={fieldState.invalid}
                      rows={2}
                      placeholder="e.g. Westlands, Nairobi"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}
