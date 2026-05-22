"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  FormProvider,
  type Resolver,
  useForm,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  Bike,
} from "lucide-react";
import { toast } from "sonner";
import Breadcrumb from "@/components/shared/breadcrumb";
import MediaUploader from "@/components/shared/media-uploader";
import { LoadingButton } from "@/components/shared/loading-button";
import { FormError } from "@/components/shared/form-error";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiderRegistrationInputSchema } from "@/lib/validator";
import {
  submitRiderRegistration,
  getRiderRegistrationStatus,
  type RiderRegistrationStatusResponse,
} from "@/lib/actions/rider-profile.actions";

const DRAFT_KEY = "rider-registration-draft-v1";

type RiderFormValues = z.infer<typeof RiderRegistrationInputSchema>;

type StepKey =
  | "fullName"
  | "phone"
  | "location"
  | "vehicleType"
  | "capacity"
  | "plateNumber"
  | "licenseNumber"
  | "nationalIdNumber"
  | "identityDocumentUrl"
  | "selfieUrl"
  | "vehicleLicenseUrl"
  | "vehicleInsuranceUrl"
  | "vehiclePhotoUrl"
  | "termsAccepted"
  | "attestationAccepted";

const steps = [
  {
    id: "personal",
    title: "Personal Details",
    description: "Name and contact",
    fields: ["fullName", "phone", "location"] as StepKey[],
  },
  {
    id: "vehicle",
    title: "Vehicle Details",
    description: "Type, capacity, and plate",
    fields: ["vehicleType", "capacity", "plateNumber"] as StepKey[],
  },
  {
    id: "kyc-documents",
    title: "KYC & Documents",
    description: "Identity and vehicle verification",
    fields: [
      "nationalIdNumber",
      "licenseNumber",
      "identityDocumentUrl",
      "selfieUrl",
      "vehicleLicenseUrl",
      "vehicleInsuranceUrl",
      "vehiclePhotoUrl",
    ] as StepKey[],
  },
  {
    id: "compliance",
    title: "Compliance",
    description: "Terms and attestation",
    fields: ["termsAccepted", "attestationAccepted"] as StepKey[],
  },
];

const defaultValues: RiderFormValues = {
  fullName: "",
  phone: "",
  location: "",
  vehicleType: "motorbike",
  capacity: 1,
  plateNumber: "",
  licenseNumber: "",
  nationalIdNumber: "",
  identityDocumentUrl: "",
  selfieUrl: "",
  vehicleLicenseUrl: "",
  vehicleInsuranceUrl: "",
  vehiclePhotoUrl: "",
  termsAccepted: false,
  attestationAccepted: false,
  website: "",
};

const defaultDraftValues: Partial<RiderFormValues> = {
  fullName: "",
  phone: "",
  location: "",
  vehicleType: "motorbike",
  capacity: 1,
  plateNumber: "",
  licenseNumber: "",
  nationalIdNumber: "",
  identityDocumentUrl: "",
  selfieUrl: "",
  vehicleLicenseUrl: "",
  vehicleInsuranceUrl: "",
  vehiclePhotoUrl: "",
};

export default function RegisterRiderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(8);
  const [cancelAutoRedirect, setCancelAutoRedirect] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);
  const [statusInfo, setStatusInfo] = useState<
    | (RiderRegistrationStatusResponse & { exists: false })
    | (RiderRegistrationStatusResponse & { exists: true })
  >({ exists: false, authenticated: false });

  const form = useForm<RiderFormValues>({
    resolver: zodResolver(
      RiderRegistrationInputSchema,
    ) as Resolver<RiderFormValues>,
    defaultValues,
    mode: "onChange",
  });

  const statusBadge = useMemo(() => {
    const status = (statusInfo as any)?.status as string | undefined;

    if (status === "active") {
      return {
        icon: CheckCircle2,
        classes:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
        label: "Approved",
      };
    }

    if (status === "pending_kyc") {
      return {
        icon: Clock3,
        classes:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
        label: "Pending review",
      };
    }

    if (status === "suspended") {
      return {
        icon: AlertCircle,
        classes:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
        label: "Suspended",
      };
    }

    return null;
  }, [statusInfo]);

  useEffect(() => {
    async function hydrateStatus() {
      const status = await getRiderRegistrationStatus();
      const exists = "exists" in status ? status.exists : false;
      setStatusInfo({
        ...status,
        exists,
      } as any);

      if (exists && "fullName" in status) {
        const s = status as any;
        form.reset({
          fullName: s.fullName || "",
          phone: s.phone || "",
          location: s.location || "",
          vehicleType: (s.vehicleType || "motorbike") as any,
          capacity: s.capacity || 1,
          plateNumber: s.plateNumber || "",
          licenseNumber: s.licenseNumber || "",
          nationalIdNumber: s.nationalIdNumber || "",
          identityDocumentUrl: s.identityDocumentUrl || "",
          selfieUrl: s.selfieUrl || "",
          vehicleLicenseUrl: s.vehicleLicenseUrl || "",
          vehicleInsuranceUrl: s.vehicleInsuranceUrl || "",
          vehiclePhotoUrl: s.vehiclePhotoUrl || "",
          termsAccepted: false,
          attestationAccepted: false,
          website: "",
        });
      } else if (!exists && status.authenticated) {
        try {
          const rawDraft = localStorage.getItem(DRAFT_KEY);
          if (rawDraft) {
            const draftCandidate = JSON.parse(
              rawDraft,
            ) as Partial<RiderFormValues>;
            const partialValidation = RiderRegistrationInputSchema.safeParse({
              ...defaultDraftValues,
              ...draftCandidate,
              vehicleType: draftCandidate.vehicleType || "motorbike",
            });
            if (partialValidation.success) {
              form.reset({
                ...defaultValues,
                ...partialValidation.data,
                termsAccepted: false,
                attestationAccepted: false,
                website: "",
              });
              setDraftRestored(true);
            }
          }
        } catch {
          // ignore corrupted draft
        }
      }
      setCheckingStatus(false);
    }
    hydrateStatus();
  }, [form]);

  useEffect(() => {
    if (
      !("exists" in statusInfo) ||
      !statusInfo.exists ||
      !("status" in statusInfo) ||
      (statusInfo as any).status !== "active" ||
      cancelAutoRedirect
    ) {
      return;
    }
    setRedirectCountdown(8);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace("/rider/jobs");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [statusInfo, cancelAutoRedirect, router]);

  const isLocked =
    "exists" in statusInfo &&
    statusInfo.exists &&
    (statusInfo as any).status !== "suspended";
  const isApproved =
    "exists" in statusInfo &&
    statusInfo.exists &&
    (statusInfo as any).status === "active";
  const isEditable = !isLocked || (statusInfo as any).status === "suspended";

  useEffect(() => {
    if (!isEditable) return;
    const subscription = form.watch((values) => {
      const snapshot = {
        ...values,
        website: "",
        termsAccepted: false,
        attestationAccepted: false,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    });
    return () => subscription.unsubscribe();
  }, [form, isEditable]);

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  const handleNextStep = async () => {
    const step = steps[currentStep];
    const valid = await form.trigger(step.fields as any, { shouldFocus: true });
    if (!valid) {
      toast.error("Please fix highlighted fields before continuing.");
      return;
    }
    setCurrentStep((v) => Math.min(v + 1, steps.length - 1));
  };

  const handlePreviousStep = () => {
    setCurrentStep((v) => Math.max(v - 1, 0));
  };

  async function submitApplication(values: RiderFormValues) {
    setIsSubmitting(true);
    const payload = {
      ...values,
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      location: values.location.trim(),
      licenseNumber: values.licenseNumber.trim(),
      nationalIdNumber: values.nationalIdNumber.trim(),
      plateNumber: (values.plateNumber || "").trim(),
    };

    const response = await submitRiderRegistration(payload);
    setIsSubmitting(false);

    if (!response.success) {
      if (response.errors) {
        Object.entries(response.errors).forEach(([field, messages]: any) => {
          form.setError(field as keyof RiderFormValues, {
            type: "server",
            message: Array.isArray(messages) ? messages.join(". ") : messages,
          });
        });
      }
      toast.error(response.message || "Failed to submit registration");
      return;
    }

    localStorage.removeItem(DRAFT_KEY);
    toast.success(response.message);
    router.replace("/rider-signup/pending");
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (currentStep < steps.length - 1) {
      await handleNextStep();
      return;
    }
    await submitApplication(values);
  });

  if (checkingStatus) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <Breadcrumb />

      <section className="bg-linear-to-br from-primary/5 to-muted/5 py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4 md:px-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Bike className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {isApproved ? "Rider Approved" : "Rider Registration"}
            </h1>
            <p className="text-muted-foreground">
              {isApproved
                ? "Your rider account is live. Continue to your dashboard to manage jobs, profile, and availability."
                : "Complete the guided onboarding below. Your KYC profile is validated and reviewed before activation."}
            </p>
            {statusBadge && (
              <div
                className={`mx-auto flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusBadge.classes}`}
              >
                <statusBadge.icon className="h-4 w-4" />
                <span>{statusBadge.label}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-6 md:py-10">
        <div className="container mx-auto max-w-3xl px-4 md:px-6">
          {isApproved ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  {" " + (statusInfo as any).fullName + " is approved"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  Your KYC documents have been verified and your account is now
                  active. Head over to the delivery jobs dashboard.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/rider/jobs"
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    View Delivery Jobs
                  </Link>
                  <Link
                    href="/rider/profile"
                    className="inline-flex items-center rounded-md border px-4 py-2 font-medium hover:bg-muted"
                  >
                    Update Profile
                  </Link>
                </div>
                {!cancelAutoRedirect ? (
                  <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    Redirecting to dashboard in {redirectCountdown}s.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline underline-offset-4"
                      onClick={() => setCancelAutoRedirect(true)}
                    >
                      Stay here
                    </button>
                  </div>
                ) : (
                  <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                    Auto redirect paused.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : isLocked ? (
            <Card>
              <CardHeader>
                <CardTitle>Application Submitted</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Your KYC application is currently{" "}
                  <strong>{(statusInfo as any).status}</strong>.
                </p>
                <p>
                  Verified:{" "}
                  <strong>
                    {(statusInfo as any).isKycVerified ? "Approved" : "Pending"}
                  </strong>
                </p>
                {(statusInfo as any).adminNote ? (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    <strong>Admin note:</strong> {(statusInfo as any).adminNote}
                  </p>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <Link
                    href="/rider/profile"
                    className="inline-flex items-center rounded-md border px-4 py-2 font-medium hover:bg-muted"
                  >
                    Go to Profile Dashboard
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {(statusInfo as any).status === "suspended"
                    ? "Update & Resubmit Application"
                    : "Multi-step Rider Registration"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(statusInfo as any)?.adminNote ? (
                  <div className="mb-5 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <strong>Previous review feedback:</strong>{" "}
                    {(statusInfo as any).adminNote}
                  </div>
                ) : null}

                {draftRestored ? (
                  <div className="mb-5 rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                    A saved draft was restored. Review all sections before final
                    submission.
                  </div>
                ) : null}

                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Step {currentStep + 1} of {steps.length}
                    </span>
                    <span>{Math.round(progressPercent)}% complete</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-4">
                    {steps.map((step, index) => {
                      const active = currentStep === index;
                      const complete = currentStep > index;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => {
                            if (index <= currentStep) setCurrentStep(index);
                          }}
                          className={`rounded-md border p-2 text-left transition ${
                            active
                              ? "border-primary bg-primary/5"
                              : complete
                                ? "border-emerald-300 bg-emerald-50/40"
                                : "border-border"
                          }`}
                        >
                          <p className="text-[11px] font-semibold">{step.title}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {step.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <FormProvider {...form}>
                  <form onSubmit={onSubmit} className="space-y-5">
                    <div className="sr-only" aria-hidden>
                      <Input
                        autoComplete="off"
                        tabIndex={-1}
                        {...form.register("website")}
                      />
                    </div>

                    {currentStep === 0 && (
                      <>
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
                        <Controller
                          control={form.control}
                          name="location"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Location / Trading Area</FieldLabel>
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
                      </>
                    )}

                    {currentStep === 1 && (
                      <>
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
                                  <SelectItem value="bicycle">
                                    Bicycle
                                  </SelectItem>
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
                        <Controller
                          control={form.control}
                          name="plateNumber"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>
                                Vehicle Plate Number (optional)
                              </FieldLabel>
                              <Input
                                {...field}
                                aria-invalid={fieldState.invalid}
                                placeholder="e.g. KCA 123A"
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      </>
                    )}

                    {currentStep === 2 && (
                      <>
                        <Controller
                          control={form.control}
                          name="nationalIdNumber"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>National ID Number</FieldLabel>
                              <Input
                                {...field}
                                aria-invalid={fieldState.invalid}
                                placeholder="e.g. 12345678"
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
                              <FieldLabel>Driver&apos;s License Number</FieldLabel>
                              <Input
                                {...field}
                                aria-invalid={fieldState.invalid}
                                placeholder="e.g. DL-12345678"
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <Controller
                            control={form.control}
                            name="identityDocumentUrl"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>
                                  National ID / Identity Document{" "}
                                  <span className="text-red-500">*</span>
                                </FieldLabel>
                                <MediaUploader
                                  form={form}
                                  name="identityDocumentUrl"
                                  label="ID Card Document"
                                  uploadRoute="riderProofs"
                                  maxFiles={1}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name="selfieUrl"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>
                                  Selfie / Profile Photo{" "}
                                  <span className="text-red-500">*</span>
                                </FieldLabel>
                                <MediaUploader
                                  form={form}
                                  name="selfieUrl"
                                  label="Selfie"
                                  uploadRoute="riderProofs"
                                  maxFiles={1}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <Controller
                            control={form.control}
                            name="vehicleLicenseUrl"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>
                                  Vehicle License / Registration{" "}
                                  <span className="text-red-500">*</span>
                                </FieldLabel>
                                <MediaUploader
                                  form={form}
                                  name="vehicleLicenseUrl"
                                  label="Vehicle License"
                                  uploadRoute="riderProofs"
                                  maxFiles={1}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name="vehiclePhotoUrl"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>
                                  Vehicle Photo{" "}
                                  <span className="text-red-500">*</span>
                                </FieldLabel>
                                <MediaUploader
                                  form={form}
                                  name="vehiclePhotoUrl"
                                  label="Vehicle Photo"
                                  uploadRoute="riderProofs"
                                  maxFiles={1}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                        </div>

                        <Controller
                          control={form.control}
                          name="vehicleInsuranceUrl"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>
                                Vehicle Insurance{" "}
                                <span className="text-muted-foreground">
                                  (optional)
                                </span>
                              </FieldLabel>
                              <MediaUploader
                                form={form}
                                name="vehicleInsuranceUrl"
                                label="Insurance Certificate"
                                uploadRoute="riderProofs"
                                maxFiles={1}
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      </>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <div className="rounded-md border border-muted p-4 text-sm">
                          <p className="font-semibold">Final Review</p>
                          <ul className="mt-2 space-y-1 text-muted-foreground">
                            <li>Name: {form.watch("fullName") || "-"}</li>
                            <li>Phone: {form.watch("phone") || "-"}</li>
                            <li>Vehicle: {form.watch("vehicleType") || "-"}</li>
                            <li>
                              Capacity: {form.watch("capacity") || "-"} items
                            </li>
                            <li>Location: {form.watch("location") || "-"}</li>
                          </ul>
                        </div>

                        <div className="rounded-md border border-blue-300 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                          <div className="flex items-start gap-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                              KYC documents are reviewed before your account is
                              activated. Never share your ID or license details
                              outside this platform.
                            </p>
                          </div>
                        </div>

                        <Controller
                          control={form.control}
                          name="termsAccepted"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <div className="flex items-start gap-3 rounded-md border p-3">
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) =>
                                    field.onChange(checked === true)
                                  }
                                />
                                <div>
                                  <FieldLabel className="m-0">
                                    I accept the platform terms and rider policy
                                  </FieldLabel>
                                  <p className="text-xs text-muted-foreground">
                                    Confirm compliance and truthful data
                                    representation.
                                  </p>
                                </div>
                              </div>
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="attestationAccepted"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <div className="flex items-start gap-3 rounded-md border p-3">
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) =>
                                    field.onChange(checked === true)
                                  }
                                />
                                <div>
                                  <FieldLabel className="m-0">
                                    I attest all submitted data is accurate
                                  </FieldLabel>
                                  <p className="text-xs text-muted-foreground">
                                    False information may lead to rejection or
                                    permanent suspension.
                                  </p>
                                </div>
                              </div>
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      </div>
                    )}

                    <FormError
                      message={(form.formState.errors.root as any)?.message}
                    />

                    <div className="flex flex-col-reverse gap-2 pt-2 md:flex-row md:justify-between">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePreviousStep}
                          disabled={currentStep === 0 || isSubmitting}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        {currentStep < steps.length - 1 ? (
                          <Button type="button" onClick={handleNextStep}>
                            Next
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>

                      {currentStep === steps.length - 1 ? (
                        <LoadingButton
                          type="submit"
                          className="w-full md:w-auto"
                          loading={isSubmitting}
                          loadingText="Submitting..."
                          disabled={isSubmitting}
                        >
                          {(statusInfo as any).status === "suspended"
                            ? "Resubmit Application"
                            : "Submit Rider Application"}
                        </LoadingButton>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            localStorage.removeItem(DRAFT_KEY);
                            toast.success("Draft cleared");
                          }}
                        >
                          Clear draft
                        </Button>
                      )}
                    </div>
                  </form>
                </FormProvider>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
