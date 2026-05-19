"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordRequirements } from "@/components/shared/password-requirements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/shared/form-error";
import { setPasswordBody } from "@/lib/actions/user.actions";
import { passwordSchema } from "@/lib/validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const setPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SetPasswordValues = z.infer<typeof setPasswordSchema>;

export function SetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit({ newPassword, confirmPassword }: SetPasswordValues) {
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const result = await setPasswordBody(newPassword);

    if (!result.success) {
      if (result.code === "PASSWORD_ALREADY_SET") {
        toast.info("Password is already set. Use Change Password below.");
        form.reset();
        router.refresh();
        return;
      }
      setError(result.message || "Failed to set password");
    } else {
      toast.success("Password set successfully");
      form.reset();
      router.refresh();
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Password</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>New Password</FieldLabel>
                  
                    <PasswordInput
                      aria-invalid={fieldState.invalid} {...field}
                      placeholder="Create a strong password"
                    />
                  
                  <PasswordRequirements
                    password={form.watch("newPassword") || ""}
                  />
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Confirm Password</FieldLabel>
                  
                    <PasswordInput
                      aria-invalid={fieldState.invalid} {...field}
                      placeholder="Re-enter your password"
                    />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <FormError message={error || undefined} />
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Setting password..."
              disabled={
                loading ||
                !form.getValues("newPassword") ||
                form.getValues("newPassword").length === 0 ||
                !form.formState.isValid
              }
            >
              Set password
            </LoadingButton>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
