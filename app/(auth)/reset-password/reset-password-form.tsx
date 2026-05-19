"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordRequirements } from "@/components/shared/password-requirements";
import { FormError } from "@/components/shared/form-error";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { passwordSchema } from "@/lib/validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { z } from "zod";

const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  async function onSubmit({ newPassword }: ResetPasswordValues) {
    setSuccess(null);
    setError(null);

    const { error } = await authClient.resetPassword({
      newPassword,
      token,
    });

    if (error) {
      setError(error.message || "Something went wrong");
    } else {
      setSuccess("Password has been reset. You can now sign in.");
      setTimeout(() => router.push("/sign-in"), 3000);
      form.reset();
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>New password</FieldLabel>
                  
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="Enter new password"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  
                  <PasswordRequirements
                    password={form.watch("newPassword") || ""}
                  />
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            {success && (
              <div role="status" className="text-sm text-green-600">
                {success}
              </div>
            )}
            <FormError message={error || undefined} />

            <LoadingButton
              type="submit"
              className="w-full"
              loading={loading}
              loadingText="Loading..."
            >
              Reset password
            </LoadingButton>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
