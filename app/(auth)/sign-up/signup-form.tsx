"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, User, Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/shared/google-icon";
import { authClient } from "@/lib/auth-client";
import { passwordSchema } from "@/lib/validator";
import { sanitizeRedirectPath, toSignInPath } from "@/lib/redirects";
import { PasswordInput } from "@/components/shared/password-input";
import { LoadingButton } from "@/components/shared/loading-button";
import { FormError } from "@/components/shared/form-error";
import SeparatorWithOr from "@/components/shared/separator-or";
import { PasswordRequirements } from "@/components/shared/password-requirements";

const signUpSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: passwordSchema,
});

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = sanitizeRedirectPath(
    searchParams.get("redirect")?.trim() ?? "",
  );

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit({ name, email, password }: SignUpValues) {
    setError(null);
    setLoading(true);
    const { error } = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: `${window.location.origin}/email-verified?redirect=${encodeURIComponent(redirect)}`,
    });
    setLoading(false);
    if (error) {
      setError(error.message || "Sign up failed");
    } else {
      localStorage.setItem("auth:known-user", "1");
      router.push(
        `/verify-email?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}`,
      );
    }
  }

  async function handleSocialSignIn(provider: "google") {
    setError(null);
    setLoadingProvider(provider);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: `${window.location.origin}${redirect}`,
    });
    setLoadingProvider(null);
    if (error) setError(error.message || "Sign up failed");
  }

  return (
    <div className="auth-form-entry">
      {/* ── Premium glass card ──────────────────────────────── */}
      <Card className="auth-mobile-card mx-auto w-full max-w-107.5 border-border/60 bg-card/60 backdrop-blur-2xl rounded-3xl overflow-hidden relative">
        {/* top glow accent */}
        <div
          className="auth-card-glow absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full
                         bg-primary/12 blur-[72px] pointer-events-none"
        />

        <CardHeader className="space-y-1.5 pb-1 relative pt-8 px-8">
          {/* Back link on mobile */}
          <div className="lg:hidden mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to shop
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Join <span className="font-semibold mx-0.5">ShoePedi</span> and
            start your style journey
          </CardDescription>
        </CardHeader>

        <CardContent className="relative px-8 space-y-5">
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="auth-form-group is-signup space-y-5"
            >
              {/* Full name */}
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="form-premium-label">
                      Full name
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <User className="h-4 w-4 text-muted-foreground pointer-events-none" />
                      </InputGroupAddon>
                      <InputGroupInput
                        type="name"
                        placeholder="John Doe"
                        className="auth-input"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                    </InputGroup>
                    <FieldError
                      className="text-xs"
                      errors={[fieldState.error]}
                    />
                  </Field>
                )}
              />

              {/* Email */}
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="form-premium-label">
                      Email address
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Mail className="h-4 w-4 text-muted-foreground pointer-events-none" />
                      </InputGroupAddon>
                      <InputGroupInput
                        type="email"
                        placeholder="you@example.com"
                        className="auth-input"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                    </InputGroup>
                    <FieldError
                      className="text-xs"
                      errors={[fieldState.error]}
                    />
                  </Field>
                )}
              />

              {/* Password */}
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="form-premium-label">
                      Password
                    </FieldLabel>

                    <PasswordInput
                      placeholder="Create a strong password"
                      className="auth-input"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />

                    <FieldError
                      className="text-xs"
                      errors={[fieldState.error]}
                    />
                  </Field>
                )}
              />

              {/* Trust hint */}
              <div className="auth-addon">
                <PasswordRequirements password={form.watch("password") || ""} />
              </div>

              {/* Error */}
              <FormError message={error || undefined} />

              {/* CTA */}
              <div className="pt-1">
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingText="Creating account…"
                  disabled={
                    loading ||
                    loadingProvider !== null ||
                    !!error ||
                    form.formState.isSubmitting ||
                    !form.formState.isValid ||
                    !form.getValues("name") ||
                    !form.getValues("email") ||
                    !form.getValues("password") ||
                    form.getValues("password").length === 0 ||
                    form.getValues("email").length === 0 ||
                    !!form.formState.errors.email ||
                    !!form.formState.errors.password ||
                    false
                  }
                  className="btn-primary-cta h-12 w-full text-[15px] font-semibold rounded-2xl
                             text-background px-7
                             focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer
                             transform active:scale-[0.985] transition-all duration-200"
                >
                  <span className="flex items-center gap-1.5">
                    Create account
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </LoadingButton>
              </div>
            </form>
          </FormProvider>

          <SeparatorWithOr>Or continue with</SeparatorWithOr>

          {/* Social button */}
          <div className="auth-addon">
            <Button
              type="button"
              variant="outline"
              className="auth-social-btn w-full rounded-xl h-11 gap-3
                         border-border hover:bg-accent/60 hover:border-border/80
                         transition-all duration-200 active:scale-[0.985]"
              onClick={() => handleSocialSignIn("google")}
              disabled={loading || loadingProvider !== null}
            >
              {loadingProvider ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon className="h-4.5 w-4.5" />
              )}
              <span className="text-sm font-medium">
                {loadingProvider ? "Signing up…" : "Google"}
              </span>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border/50 flex items-center justify-center py-5 px-8">
          <p className="auth-card-footer-text text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link
              href={toSignInPath(redirect)}
              className="text-primary font-semibold transition-opacity hover:opacity-80"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
