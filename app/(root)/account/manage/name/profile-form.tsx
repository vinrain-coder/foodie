"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { User } from "@/lib/auth";
import { useState } from "react";
import { LoadingButton } from "@/components/shared/loading-button";
import { FormError } from "@/components/shared/form-error";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }),
  image: z.string().optional().nullable(),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

interface ProfileDetailsFormProps {
  user: User;
}

export function ProfileDetailsForm({ user }: ProfileDetailsFormProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name ?? "",
      image: user.image ?? null,
    },
  });

  async function onSubmit(values: UpdateProfileValues) {
    setStatus(null);
    setError(null);

    const { error } = await authClient.updateUser(values);

    if (error) {
      setError(error.message || "Failed to update profile");
    } else {
      setStatus("Profile updated");
      router.refresh();
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Name</FieldLabel>
              
                <Input aria-invalid={fieldState.invalid} {...field} placeholder="Full name" />
              
              <FieldError  errors={[fieldState.error]} />
            </Field>
          )}
        />

        {/* Later you can add an image field here if needed */}

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
          Save changes
        </LoadingButton>
      </form>
    </FormProvider>
  );
}
