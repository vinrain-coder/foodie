"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, Clock } from "lucide-react";
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
import { authClient } from "@/lib/auth-client";
import { toSignInPath } from "@/lib/redirects";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";

const RATE_LIMIT_SECONDS = 60;

const emailSchema = z.object({
  email: z
    .string()
    .max(254, { message: "Email must not exceed 254 characters" })
    .pipe(z.string().email({ message: "Please enter a valid email" })),
  // Honeypot field — trapped bots will fill this in
  _hp: z.string().optional(),
});

type EmailValues = z.infer<typeof emailSchema>;

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const submittedEmails = useRef<Set<string>>(new Set());
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", _hp: "" },
  });

  // Countdown timer for rate-limit cooldown
  useEffect(() => {
    if (cooldown > 0 && !cooldownRef.current) {
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) {
              clearInterval(cooldownRef.current);
              cooldownRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, [cooldown]);

  function isBotSubmission(userHP: { _hp?: string }): boolean {
    return typeof userHP._hp === "string" && userHP._hp.length > 0;
  }

  async function onSubmit(data: EmailValues) {
    // Honeypot: silently reject bots
    if (isBotSubmission(data)) {
      setError("Something went wrong. Please try again.");
      return;
    }

    const normalizedEmail = data.email.toLowerCase().trim();

    // Block duplicate submissions in the same page session
    if (submittedEmails.current.has(normalizedEmail)) {
      setError(
        "A reset link has already been sent to this email. Please check your inbox.",
      );
      return;
    }

    // Block submission while cooldown is active
    if (cooldown > 0) {
      setError(
        `Please wait ${cooldown} second${cooldown !== 1 ? "s" : ""} before requesting another reset.`,
      );
      return;
    }

    setSuccess(null);
    setError(null);
    setLoading(true);

    const { error: submitError } = await authClient.requestPasswordReset({
      email: normalizedEmail,
    });

    if (submitError) {
      setError(submitError.message || "Something went wrong");
    } else {
      setSuccess(
        "If an account exists for this email, we have sent reset instructions.",
      );
      submittedEmails.current.add(normalizedEmail);
      form.reset();
      setCooldown(RATE_LIMIT_SECONDS);
    }

    setLoading(false);
  }

  const isDisabled = loading || cooldown > 0;

  return (
    <div className="auth-form-entry">
      {/* ── Premium glass card ─────────────────────────────────── */}
      <Card className="auth-mobile-card mx-auto w-full max-w-107.5 border-border/60 bg-card/60 backdrop-blur-2xl rounded-3xl overflow-hidden relative">
        {/* top glow accent */}
        <div
          className="auth-card-glow absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full
                         bg-primary/12 blur-[72px] pointer-events-none"
        />

        <CardHeader className="space-y-1.5 pb-1 relative pt-8 px-8">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Reset your password
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your email and we will send you reset instructions
          </CardDescription>
        </CardHeader>

        <CardContent className="relative px-8 space-y-5">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* ── Honeypot ─────────────────────────────────────── */}
              <Controller
                control={form.control}
                name="_hp"
                render={({ fieldState }) => (
                  <Field className="hidden" data-invalid={fieldState.invalid}>
                    
                      <Input type="text" tabIndex={-1} autoComplete="off" />
                    
                  </Field>
                )}
              />

              {/* ── Email ───────────────────────────────────────── */}
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
                        <Mail
                          className="h-4 w-4 text-muted-foreground pointer-events-none"
                          aria-hidden="true"
                        />
                      </InputGroupAddon>
                      <InputGroupInput
                        type="email"
                        placeholder="you@example.com"
                        className="auth-input"
                        disabled={isDisabled}
                        autoComplete="email"
                        aria-describedby={error ? "forgotpw-error" : undefined}
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                    </InputGroup>
                    <FieldError className="text-xs"  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* ── Cooldown ────────────────────────────────────── */}
              {cooldown > 0 && (
                <div className="auth-addon">
                  <div
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    <span>You can request another reset in {cooldown}s</span>
                  </div>
                </div>
              )}

              {/* ── Success ─────────────────────────────────────── */}
              {success && !error && (
                <div className="auth-addon">
                  <div
                    role="status"
                    className="text-sm text-green-600"
                    aria-live="polite"
                  >
                    {success}
                  </div>
                </div>
              )}

              {/* ── Error ───────────────────────────────────────── */}
              <div className="auth-addon" id="forgotpw-error">
                <FormError message={error || undefined} />
              </div>

              {/* ── CTA ─────────────────────────────────────────── */}
              <div className="pt-1">
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingText="Sending..."
                  disabled={
                    loading ||
                    !!error ||
                    form.formState.isSubmitting ||
                    !form.getValues("email")
                  }
                  className="btn-primary-cta group h-12 w-full text-[15px] font-semibold rounded-2xl
                             text-background px-7
                             focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer
                             transform active:scale-[0.985] transition-all duration-200"
                >
                  <span className="flex items-center gap-1.5">
                    Send reset link
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </LoadingButton>
              </div>
            </form>
          </FormProvider>
        </CardContent>

        <CardFooter className="border-t border-border/50 flex items-center justify-center py-5 px-8">
          <p className="auth-card-footer-text text-sm text-muted-foreground text-center">
            Remember your password?{" "}
            <Link
              href={toSignInPath("/")}
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
