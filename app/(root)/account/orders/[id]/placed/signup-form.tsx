"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordRequirements } from "@/components/shared/password-requirements";
import { FormError } from "@/components/shared/form-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { passwordSchema } from "@/lib/validator";

const signUpSchema = z
  .object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Please enter a valid email" }),
    password: passwordSchema,
    passwordConfirmation: z
      .string()
      .min(1, { message: "Please confirm password" }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export function GuestSignUpForm({
  orderId,
  accessToken,
  defaultEmail,
  defaultName,
}: {
  orderId: string;
  accessToken: string;
  defaultEmail: string;
  defaultName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: defaultName || "",
      email: defaultEmail || "",
      password: "",
      passwordConfirmation: "",
    },
  });

  async function onSubmit({ email, password, name }: SignUpValues) {
    setError(null);

    const redirectPath = `/account/orders/${orderId}?accessToken=${accessToken}&linkOrder=true`;
    const encodedRedirect = encodeURIComponent(redirectPath);

    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: `/verify-email?redirect=${encodedRedirect}`,
    });

    if (signUpError) {
      setError(signUpError.message || "Something went wrong");
    } else {
      toast.success(
        "Account created! Please verify your email to link this order.",
      );
      // We'll let the verify-email page handle the redirect,
      // but we could also store the link intent in localStorage
      localStorage.setItem(
        "link_order_after_verify",
        JSON.stringify({ orderId, accessToken }),
      );
      router.push(`/verify-email?redirect=${encodedRedirect}`);
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <Card className="w-full shadow-sm border rounded-2xl mt-8">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-xl font-bold">Save your details</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Create an account to track this order and earn rewards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 text-left"
          >
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Name</FieldLabel>
                  
                    <Input placeholder="John Doe" aria-invalid={fieldState.invalid} {...field} />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Email</FieldLabel>
                  
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Password</FieldLabel>
                    
                      <PasswordInput placeholder="Password" aria-invalid={fieldState.invalid} {...field} />
                    
                    <PasswordRequirements
                      password={form.watch("password") || ""}
                    />
                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="passwordConfirmation"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Confirm Password</FieldLabel>
                    
                      <PasswordInput
                        placeholder="Confirm password"
                        aria-invalid={fieldState.invalid} {...field}
                      />
                    
                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <FormError message={error || undefined} />

            <LoadingButton
              type="submit"
              className="w-full font-semibold"
              loading={loading}
            >
              Create account & Save order
            </LoadingButton>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
