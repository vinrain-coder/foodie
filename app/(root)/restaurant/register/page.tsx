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
  Store,
} from "lucide-react";

import {
  RestaurantApplicationInputSchema,
  RestaurantRegistrationInputSchema,
} from "@/lib/validator";
import {
  getRestaurantApplicationStatus,
  registerRestaurantApplication,
  type RestaurantApplicationStatusResponse,
} from "@/lib/actions/restaurant.actions";
import { toSlug } from "@/lib/utils";
import { toSignInPath } from "@/lib/redirects";
import Breadcrumb from "@/components/shared/breadcrumb";
import MediaUploader from "@/components/shared/media-uploader";
import { LoadingButton } from "@/components/shared/loading-button";
import { FormError } from "@/components/shared/form-error";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const DRAFT_KEY = "restaurant-registration-draft-v2";

type RestaurantFormValues = z.infer<typeof RestaurantRegistrationInputSchema>;

type StepKey =
  | "name"
  | "slug"
  | "logo"
  | "coverImage"
  | "description"
  | "cuisineTypes"
  | "deliveryFee"
  | "minimumOrderAmount"
  | "averagePrepTimeMinutes"
  | "acceptsDelivery"
  | "acceptsPickup"
  | "phone"
  | "whatsapp"
  | "email"
  | "location"
  | "openingHours"
  | "termsAccepted"
  | "attestationAccepted";

const steps: {
  id: string;
  title: string;
  description: string;
  fields: StepKey[];
}[] = [
  {
    id: "business-profile",
    title: "Business Profile",
    description: "Brand, visibility, and cuisine identity",
    fields: ["name", "slug", "logo", "coverImage", "description", "cuisineTypes"],
  },
  {
    id: "operations",
    title: "Operations",
    description: "Delivery model and order readiness",
    fields: [
      "deliveryFee",
      "minimumOrderAmount",
      "averagePrepTimeMinutes",
      "acceptsDelivery",
      "acceptsPickup",
    ],
  },
  {
    id: "contact-location",
    title: "Contact & Location",
    description: "Verified communication and trading location",
    fields: ["phone", "whatsapp", "email", "location", "openingHours"],
  },
  {
    id: "review-compliance",
    title: "Review & Compliance",
    description: "Confirm data integrity and policies",
    fields: ["termsAccepted", "attestationAccepted"],
  },
];

const defaultValues: RestaurantFormValues = {
  name: "",
  slug: "",
  logo: "",
  coverImage: "",
  phone: "",
  whatsapp: "",
  location: "",
  description: "",
  openingHours: "",
  deliveryFee: 0,
  minimumOrderAmount: 0,
  email: "",
  cuisineTypes: [],
  acceptsDelivery: true,
  acceptsPickup: false,
  averagePrepTimeMinutes: 30,
  termsAccepted: false,
  attestationAccepted: false,
  website: "",
};

export default function RegisterRestaurantPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(8);
  const [cancelAutoRedirect, setCancelAutoRedirect] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    exists: boolean;
    status?: "pending" | "approved" | "rejected";
    isApproved?: boolean;
    isActive?: boolean;
    adminNote?: string;
  }>({ exists: false });

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(
      RestaurantRegistrationInputSchema,
    ) as Resolver<RestaurantFormValues>,
    defaultValues,
    mode: "onChange",
  });

  const statusBadge = useMemo(() => {
    if (statusInfo.status === "approved") {
      return {
        icon: CheckCircle2,
        classes:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
        label: "Approved",
      };
    }

    if (statusInfo.status === "pending") {
      return {
        icon: Clock3,
        classes:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
        label: "Pending review",
      };
    }

    if (statusInfo.status === "rejected") {
      return {
        icon: AlertCircle,
        classes:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
        label: "Rejected",
      };
    }

    return null;
  }, [statusInfo.status]);

  useEffect(() => {
    async function hydrateStatus() {
      const status: RestaurantApplicationStatusResponse =
        await getRestaurantApplicationStatus();

      if (!status.authenticated) {
        router.push(toSignInPath("/restaurant/register"));
        return;
      }

      setStatusInfo({
        exists: status.exists,
        status: status.exists ? status.status : undefined,
        isApproved: status.exists ? status.isApproved : undefined,
        isActive: status.exists ? status.isActive : undefined,
        adminNote: status.exists ? status.adminNote || "" : "",
      });

      if (status.exists) {
        if (status.status === "pending") {
          router.replace("/restaurant/pending");
          return;
        }

        form.reset({
          ...defaultValues,
          ...status.application,
          cuisineTypes: status.application.cuisineTypes || [],
          deliveryFee: Number(status.application.deliveryFee || 0),
          minimumOrderAmount: Number(
            status.application.minimumOrderAmount || 0,
          ),
          averagePrepTimeMinutes: Number(
            status.application.averagePrepTimeMinutes || 30,
          ),
          termsAccepted: false,
          attestationAccepted: false,
          website: "",
        });
      } else {
        try {
          const rawDraft = localStorage.getItem(DRAFT_KEY);
          if (rawDraft) {
            const draftCandidate = JSON.parse(rawDraft) as Partial<
              RestaurantFormValues
            >;
            const partialValidation = RestaurantApplicationInputSchema.safeParse(
              {
                ...defaultValues,
                ...draftCandidate,
                slug: toSlug(draftCandidate.slug || draftCandidate.name || ""),
              },
            );

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
          // Ignore corrupted draft snapshots.
        }
      }

      setCheckingStatus(false);
    }

    hydrateStatus();
  }, [form, router]);

  useEffect(() => {
    if (statusInfo.status !== "approved" || cancelAutoRedirect) return;

    setRedirectCountdown(8);

    const interval = setInterval(() => {
      setRedirectCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          router.replace("/restaurant-admin");
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [statusInfo.status, cancelAutoRedirect, router]);

  const lockForm = statusInfo.exists && statusInfo.status !== "rejected";
  const isApproved = statusInfo.status === "approved";
  const isEditable = !lockForm && !isApproved;

  useEffect(() => {
    if (!isEditable) return;

    const subscription = form.watch((values) => {
      const snapshot = {
        ...values,
        slug: toSlug(values.slug || values.name || ""),
        website: "",
        termsAccepted: false,
        attestationAccepted: false,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    });

    return () => subscription.unsubscribe();
  }, [form, isEditable]);

  const nameValue = form.watch("name");
  useEffect(() => {
    form.setValue("slug", toSlug(nameValue), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [nameValue, form]);

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  const handleNextStep = async () => {
    const step = steps[currentStep];
    const valid = await form.trigger(step.fields, { shouldFocus: true });
    if (!valid) {
      toast.error("Please fix highlighted fields before continuing.");
      return;
    }
    setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
  };

  const handlePreviousStep = () => {
    setCurrentStep((value) => Math.max(value - 1, 0));
  };

  async function submitApplication(values: RestaurantFormValues) {
    setIsSubmitting(true);

    const payload: RestaurantFormValues = {
      ...values,
      slug: toSlug(values.slug || values.name),
      name: values.name.trim(),
      phone: values.phone.trim(),
      whatsapp: values.whatsapp.trim(),
      location: values.location.trim(),
      description: values.description.trim(),
      openingHours: values.openingHours.trim(),
      email: values.email?.trim().toLowerCase() || "",
      cuisineTypes: Array.from(
        new Set(
          (values.cuisineTypes || [])
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      ),
      website: values.website?.trim() || "",
    };

    const response = await registerRestaurantApplication(payload);
    setIsSubmitting(false);

    if (!response.success) {
      if (response.errors) {
        Object.entries(response.errors).forEach(([field, messages]) => {
          form.setError(field as keyof RestaurantFormValues, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(response.message || "Failed to submit application");
      return;
    }

    localStorage.removeItem(DRAFT_KEY);
    toast.success(response.message);
    router.replace("/restaurant/pending");
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

  const application = form.getValues();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <Breadcrumb />

      <section className="bg-linear-to-br from-primary/5 to-muted/5 py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4 md:px-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {isApproved ? "Restaurant Approved" : "Restaurant Registration"}
            </h1>
            <p className="text-muted-foreground">
              {isApproved
                ? "Your restaurant is live. Continue to your dashboard to manage menu items, orders, and settings."
                : "Complete the guided onboarding below. Your application is validated and reviewed before activation."}
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
                  {application.name || "Your restaurant"} is approved
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  Great news. Your restaurant account is now approved and ready
                  for operations.
                </p>

                <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <p>
                    Operational status:{" "}
                    <strong>{statusInfo.isActive ? "Active" : "Inactive"}</strong>
                  </p>
                  {application.slug ? (
                    <p className="mt-1">
                      Public page:{" "}
                      <Link
                        href={`/restaurants/${application.slug}`}
                        className="font-medium underline underline-offset-4"
                      >
                        /restaurants/{application.slug}
                      </Link>
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/restaurant-admin"
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    href="/restaurant-admin/settings"
                    className="inline-flex items-center rounded-md border px-4 py-2 font-medium hover:bg-muted"
                  >
                    Restaurant Settings
                  </Link>
                  {application.slug ? (
                    <Link
                      href={`/restaurants/${application.slug}`}
                      className="inline-flex items-center rounded-md border px-4 py-2 font-medium hover:bg-muted"
                    >
                      View Storefront Page
                    </Link>
                  ) : null}
                </div>

                {!cancelAutoRedirect ? (
                  <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    Redirecting to dashboard in {redirectCountdown}s.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline underline-offset-4"
                      onClick={() => setCancelAutoRedirect(true)}
                    >
                      Stay on this page
                    </button>
                  </div>
                ) : (
                  <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                    Auto redirect paused.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : lockForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Application Submitted</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Your application is currently <strong>{statusInfo.status}</strong>.
                </p>
                <p>
                  Approval:{" "}
                  <strong>
                    {statusInfo.isApproved ? "Approved" : "Not approved"}
                  </strong>
                </p>
                <p>
                  Active:{" "}
                  <strong>{statusInfo.isActive ? "Active" : "Inactive"}</strong>
                </p>
                {statusInfo.adminNote ? (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    <strong>Admin note:</strong> {statusInfo.adminNote}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {statusInfo.status === "rejected"
                    ? "Update & Resubmit Application"
                    : "Multi-step Registration"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusInfo.adminNote ? (
                  <div className="mb-5 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <strong>Previous review feedback:</strong>{" "}
                    {statusInfo.adminNote}
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
                          name="name"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Restaurant Name</FieldLabel>
                              <Input
                                {...field}
                                aria-invalid={fieldState.invalid}
                                placeholder="e.g. Nyama Hub"
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="slug"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Slug</FieldLabel>
                              <Input
                                {...field}
                                aria-invalid={fieldState.invalid}
                                placeholder="e.g. nyama-hub"
                                onChange={(event) => {
                                  field.onChange(toSlug(event.target.value));
                                }}
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <MediaUploader
                            form={form}
                            name="logo"
                            label="Logo"
                            uploadRoute="restaurants"
                            maxFiles={1}
                          />
                          <MediaUploader
                            form={form}
                            name="coverImage"
                            label="Cover Image"
                            uploadRoute="restaurants"
                            maxFiles={1}
                          />
                        </div>

                        <Controller
                          control={form.control}
                          name="description"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Description</FieldLabel>
                              <Textarea
                                {...field}
                                aria-invalid={fieldState.invalid}
                                rows={4}
                                placeholder="Tell customers what makes your restaurant special."
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="cuisineTypes"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Cuisine Types</FieldLabel>
                              <Input
                                value={(field.value || []).join(", ")}
                                onChange={(event) => {
                                  const items = event.target.value
                                    .split(",")
                                    .map((entry) => entry.trim())
                                    .filter(Boolean);
                                  field.onChange(items);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="e.g. African, Grills, Fast Food"
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      </>
                    )}

                    {currentStep === 1 && (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <Controller
                            control={form.control}
                            name="deliveryFee"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Delivery Fee</FieldLabel>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  aria-invalid={fieldState.invalid}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name="minimumOrderAmount"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Minimum Order</FieldLabel>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  aria-invalid={fieldState.invalid}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name="averagePrepTimeMinutes"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Prep Time (mins)</FieldLabel>
                                <Input
                                  {...field}
                                  type="number"
                                  min={5}
                                  max={300}
                                  step={1}
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
                            name="acceptsDelivery"
                            render={({ field }) => (
                              <Field>
                                <div className="flex items-center gap-3 rounded-md border p-3">
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) =>
                                      field.onChange(checked === true)
                                    }
                                  />
                                  <FieldLabel className="m-0">
                                    Accept delivery orders
                                  </FieldLabel>
                                </div>
                              </Field>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name="acceptsPickup"
                            render={({ field }) => (
                              <Field>
                                <div className="flex items-center gap-3 rounded-md border p-3">
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) =>
                                      field.onChange(checked === true)
                                    }
                                  />
                                  <FieldLabel className="m-0">
                                    Accept pickup orders
                                  </FieldLabel>
                                </div>
                              </Field>
                            )}
                          />
                        </div>
                      </>
                    )}

                    {currentStep === 2 && (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Controller
                            control={form.control}
                            name="phone"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Phone</FieldLabel>
                                <Input {...field} aria-invalid={fieldState.invalid} />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                          <Controller
                            control={form.control}
                            name="whatsapp"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>WhatsApp</FieldLabel>
                                <Input {...field} aria-invalid={fieldState.invalid} />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />
                        </div>

                        <Controller
                          control={form.control}
                          name="email"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Business Email (Optional)</FieldLabel>
                              <Input
                                {...field}
                                type="email"
                                aria-invalid={fieldState.invalid}
                                placeholder="owner@restaurant.com"
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
                              <FieldLabel>Location</FieldLabel>
                              <Input
                                {...field}
                                aria-invalid={fieldState.invalid}
                                placeholder="Street, area, city"
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="openingHours"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Opening Hours</FieldLabel>
                              <Textarea
                                {...field}
                                aria-invalid={fieldState.invalid}
                                rows={3}
                                placeholder="Mon-Fri: 8:00 AM - 9:00 PM, Sat-Sun: 9:00 AM - 10:00 PM"
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
                          <p className="font-semibold">Final review</p>
                          <ul className="mt-2 space-y-1 text-muted-foreground">
                            <li>Restaurant: {form.watch("name") || "-"}</li>
                            <li>Slug: {form.watch("slug") || "-"}</li>
                            <li>Phone: {form.watch("phone") || "-"}</li>
                            <li>
                              Delivery fee: {Number(form.watch("deliveryFee") || 0)}
                            </li>
                            <li>
                              Minimum order: {Number(form.watch("minimumOrderAmount") || 0)}
                            </li>
                          </ul>
                        </div>

                        <div className="rounded-md border border-blue-300 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                          <div className="flex items-start gap-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4" />
                            <p>
                              To protect customers and prevent fraud, we validate
                              identity signals, contact uniqueness, and submission
                              patterns before approval.
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
                                    I accept the platform terms and onboarding policy
                                  </FieldLabel>
                                  <p className="text-xs text-muted-foreground">
                                    You confirm operational compliance and truthful business
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
                                    I attest all submitted business data is accurate
                                  </FieldLabel>
                                  <p className="text-xs text-muted-foreground">
                                    False information may lead to rejection or permanent
                                    suspension.
                                  </p>
                                </div>
                              </div>
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      </div>
                    )}

                    <FormError message={form.formState.errors.root?.message} />

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
                          {statusInfo.status === "rejected"
                            ? "Resubmit Application"
                            : "Submit Application"}
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
