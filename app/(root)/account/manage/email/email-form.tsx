"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { LoadingButton } from "@/components/shared/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { FormError } from "@/components/shared/form-error";
import z from "zod";

export const updateEmailSchema = z.object({
  newEmail: z.string().email({ message: "Enter a valid email" }),
});

export type UpdateEmailValues = z.infer<typeof updateEmailSchema>;

interface EmailFormProps {
  currentEmail: string;
}

export function EmailForm({ currentEmail }: EmailFormProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpdateEmailValues>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      newEmail: currentEmail,
    },
  });

  async function onSubmit({ newEmail }: UpdateEmailValues) {
    setStatus(null);
    setError(null);

    const { error } = await authClient.changeEmail({
      newEmail,
      callbackURL: "/email-verified",
    });

    if (error) {
      setError(error.message || "Failed to initiate email change");
    } else {
      setStatus("Verification email sent to your current address");
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Email</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <Controller
              control={form.control}
              name="newEmail"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>New Email</FieldLabel>
                  
                    <Input
                      type="email"
                      placeholder="new@email.com"
                      aria-invalid={fieldState.invalid} {...field}
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
              loadingText="Submitting..."
              disabled={loading}
            >
              Request change
            </LoadingButton>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
