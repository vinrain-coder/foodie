"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, type Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, Loader2, Store } from "lucide-react";

import { RestaurantApplicationInputSchema } from "@/lib/validator";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const defaultValues = {
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
  cuisineTypes: [] as string[],
  acceptsDelivery: true,
  acceptsPickup: false,
  averagePrepTimeMinutes: 30,
};

type RestaurantFormValues = typeof defaultValues;

export default function RegisterRestaurantPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [statusInfo, setStatusInfo] = useState<{
    exists: boolean;
    status?: "pending" | "approved" | "rejected";
    isApproved?: boolean;
    isActive?: boolean;
    adminNote?: string;
  }>({ exists: false });

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(
      RestaurantApplicationInputSchema,
    ) as Resolver<RestaurantFormValues>,
    defaultValues,
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
        form.reset({
          ...defaultValues,
          ...status.application,
          cuisineTypes: status.application.cuisineTypes || [],
          deliveryFee: Number(status.application.deliveryFee || 0),
          minimumOrderAmount: Number(status.application.minimumOrderAmount || 0),
          averagePrepTimeMinutes: Number(
            status.application.averagePrepTimeMinutes || 30,
          ),
        });
      }

      setCheckingStatus(false);
    }

    hydrateStatus();
  }, [form]);

  async function onSubmit(values: RestaurantFormValues) {
    setIsSubmitting(true);
    const response = await registerRestaurantApplication({
      ...values,
      slug: toSlug(values.slug || values.name),
    });
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

    toast.success(response.message);
    router.refresh();
  }

  if (checkingStatus) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const lockForm = statusInfo.exists && statusInfo.status !== "rejected";

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
              Restaurant Registration
            </h1>
            <p className="text-muted-foreground">
              Apply to onboard your restaurant. Applications are reviewed by our
              team before activation.
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
          {lockForm ? (
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
                  <strong>{statusInfo.isApproved ? "Approved" : "Not approved"}</strong>
                </p>
                <p>
                  Active: <strong>{statusInfo.isActive ? "Active" : "Inactive"}</strong>
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
                    : "Application Form"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusInfo.adminNote ? (
                  <div className="mb-5 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <strong>Previous review feedback:</strong> {statusInfo.adminNote}
                  </div>
                ) : null}

                <FormProvider {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                  >
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
                            onChange={(event) => {
                              field.onChange(event.target.value);
                              if (!form.getValues("slug")) {
                                form.setValue("slug", toSlug(event.target.value), {
                                  shouldValidate: true,
                                });
                              }
                            }}
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

                    <FormError message={form.formState.errors.root?.message} />

                    <LoadingButton
                      type="submit"
                      className="w-full"
                      loading={isSubmitting}
                      loadingText="Submitting..."
                      disabled={isSubmitting}
                    >
                      {statusInfo.status === "rejected"
                        ? "Resubmit Application"
                        : "Submit Application"}
                    </LoadingButton>
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
