"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver, Controller, FormProvider } from "react-hook-form";
import { toast } from "sonner";

import {
  type RestaurantSettingsInput,
  updateRestaurantSettingsForOwner,
} from "@/lib/actions/restaurant.actions";
import { RestaurantApplicationInputSchema } from "@/lib/validator";
import { toSlug } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import MediaUploader from "@/components/shared/media-uploader";
import { LoadingButton } from "@/components/shared/loading-button";
import { ValidationSummary } from "@/components/shared/validation-summary";

export default function RestaurantSettingsForm({
  restaurant,
}: {
  restaurant: RestaurantSettingsInput;
}) {
  const form = useForm<RestaurantSettingsInput>({
    resolver: zodResolver(
      RestaurantApplicationInputSchema,
    ) as Resolver<RestaurantSettingsInput>,
    defaultValues: restaurant,
  });

  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: RestaurantSettingsInput) {
    const response = await updateRestaurantSettingsForOwner({
      ...values,
      slug: toSlug(values.slug || values.name),
    });

    if (!response.success) {
      if (response.errors) {
        Object.entries(response.errors).forEach(([field, messages]) => {
          form.setError(field as keyof RestaurantSettingsInput, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(response.message || "Failed to update restaurant settings");
      return;
    }

    toast.success(response.message || "Restaurant settings updated");
    form.reset(values);
  }

  return (
    <FormProvider {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card id="setting-restaurant-profile">
          <CardHeader>
            <CardTitle>Restaurant Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Restaurant Name</FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
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
                      onChange={(event) => field.onChange(toSlug(event.target.value))}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

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
                  <FieldLabel>Business Email</FieldLabel>
                  <Input {...field} type="email" aria-invalid={fieldState.invalid} />
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
                  <Input {...field} aria-invalid={fieldState.invalid} />
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
                  <Textarea {...field} rows={4} aria-invalid={fieldState.invalid} />
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
                  <Textarea {...field} rows={3} aria-invalid={fieldState.invalid} />
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
          </CardContent>
        </Card>

        <Card id="setting-restaurant-operations">
          <CardHeader>
            <CardTitle>Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    <FieldLabel>Minimum Order Amount</FieldLabel>
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
                        onCheckedChange={(checked) => field.onChange(checked === true)}
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
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                      <FieldLabel className="m-0">
                        Accept pickup orders
                      </FieldLabel>
                    </div>
                  </Field>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <ValidationSummary errors={form.formState.errors as any} />

        <LoadingButton
          type="submit"
          className="w-full"
          loading={isSubmitting}
          loadingText="Saving..."
          disabled={isSubmitting}
        >
          Save Restaurant Settings
        </LoadingButton>
      </form>
    </FormProvider>
  );
}
