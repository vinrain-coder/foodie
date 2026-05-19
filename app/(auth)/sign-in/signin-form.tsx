"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Loader2, ArrowRight, ChevronLeft } from "lucide-react";
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
import { sanitizeRedirectPath, toSignUpPath } from "@/lib/redirects";
import { PasswordInput } from "@/components/shared/password-input";
import { LoadingButton } from "@/components/shared/loading-button";
import { FormError } from "@/components/shared/form-error";
import { Checkbox } from "@/components/ui/checkbox";
import SeparatorWithOr from "@/components/shared/separator-or";

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, { message: "Password is required" }),
});

type PasswordValues = z.infer<typeof passwordSchema>;

export function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [remember, setRemember] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = sanitizeRedirectPath(
    searchParams.get("redirect")?.trim() ??
      searchParams.get("callbackUrl")?.trim() ??
      "",
  );

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: PasswordValues) {
    const { email, password } = data;
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: `${window.location.origin}${redirect}`,
      rememberMe: remember,
    });
    setLoading(false);
    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setError("Email not verified. Please verify your email to sign in.");
      } else {
        setError(error.message || "Sign in failed");
      }
    } else {
      localStorage.setItem("auth:known-user", "1");
      router.replace(redirect);
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
    if (error) setError(error.message || "Sign in failed");
  }

  async function handleResendVerification() {
    const email = form.getValues("email");
    if (!email) return;
    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/email-verified?redirect=${encodeURIComponent(redirect)}`,
    });
    setResending(false);
    if (error) {
      setError(error.message || "Failed to resend verification email");
    } else {
      router.push(
        `/verify-email?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}`,
      );
    }
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
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to shop
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="relative px-8 space-y-5">
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="auth-form-group is-signin space-y-5"
            >
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
                    <FieldError className="text-xs"  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center justify-between">
                      <FieldLabel className="form-premium-label">
                        Password
                      </FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200 underline-offset-2 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    
                      <PasswordInput
                        placeholder="Enter your password"
                        className="auth-input"
                        aria-invalid={fieldState.invalid} {...field}
                      />
                    
                    <FieldError className="text-xs"  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Remember me */}
              <div className="auth-addon">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="auth-remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v as boolean)}
                    className="rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label
                    htmlFor="auth-remember"
                    className="text-[13px] text-muted-foreground cursor-pointer select-none leading-none"
                  >
                    Remember me for 30 days
                  </label>
                </div>
              </div>

              {error && (
                <div className="auth-addon">
                  <div className="auth-form-error-mobile">
                    <FormError message={error} />
                    {error ===
                      "Email not verified. Please verify your email to sign in." && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resending}
                          className="text-xs text-primary hover:underline font-medium disabled:opacity-50"
                        >
                          {resending
                            ? "Resending…"
                            : "Resend verification email →"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-1">
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingText="Signing in…"
                  disabled={
                    loading ||
                    loadingProvider !== null ||
                    resending ||
                    !!error ||
                    form.formState.isSubmitting ||
                    !form.formState.isValid ||
                    !form.getValues("email") ||
                    !form.getValues("password") ||
                    form.getValues("password").length === 0 ||
                    form.getValues("email").length === 0 ||
                    !!form.formState.errors.email ||
                    !!form.formState.errors.password
                    || false
                  }
                  className="btn-primary-cta group h-12 w-full text-[15px] font-semibold rounded-2xl
                             text-background px-7
                             focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer
                             transform active:scale-[0.985] transition-all duration-200"
                >
                  <span className="flex items-center gap-1.5">
                    Sign in
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
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
                {loadingProvider ? "Signing in…" : "Google"}
              </span>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border/50 flex items-center justify-center py-5 px-8">
          <p className="auth-card-footer-text text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <Link
              href={toSignUpPath(redirect)}
              className="text-primary font-semibold transition-opacity hover:opacity-80"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
