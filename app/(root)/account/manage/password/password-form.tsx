"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordRequirements } from "@/components/shared/password-requirements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/shared/form-error";
import { changePassword } from "@/lib/auth-client";
import { passwordSchema } from "@/lib/validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { z } from "zod";

const updatePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Current password is required" }),
  newPassword: passwordSchema,
});

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

export function PasswordForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  async function onSubmit({
    currentPassword,
    newPassword,
  }: UpdatePasswordValues) {
    setStatus(null);
    setError(null);

    const { error } = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });

    if (error) {
      setError(error.message || "Failed to change password");
    } else {
      setStatus("Password changed");
      form.reset();
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <Controller
              control={form.control}
              name="currentPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Current Password</FieldLabel>
                  
                    <PasswordInput aria-invalid={fieldState.invalid} {...field} placeholder="Current password" />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>New Password</FieldLabel>
                  
                    <PasswordInput aria-invalid={fieldState.invalid} {...field} placeholder="New password" />
                  
                  <PasswordRequirements
                    password={form.watch("newPassword") || ""}
                  />
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <FormError message={error || undefined} />
            {status && (
              <div role="status" className="text-sm text-green-600">
                {status}
              </div>
            )}
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Changing password..."
              disabled={
                loading ||
                !form.getValues("newPassword") ||
                form.getValues("newPassword").length === 0 ||
                !form.formState.isValid
              }
            >
              Change password
            </LoadingButton>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
