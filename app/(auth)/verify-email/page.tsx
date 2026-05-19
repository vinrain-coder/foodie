"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { sanitizeRedirectPath, toSignInPath } from "@/lib/redirects";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { LoadingButton } from "@/components/shared/loading-button";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirect = sanitizeRedirectPath(searchParams.get("redirect"));

  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer !== undefined) {
        clearInterval(timer);
      }
    };
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email address is missing.");
      return;
    }

    setLoading(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: redirect,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to resend verification email.");
    } else {
      setSuccess(true);
      setCooldown(60);
      toast.success("Verification email resent!");
      setTimeout(() => setSuccess(false), 5000);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {success ? (
              <CheckCircle2 className="h-12 w-12 text-green-500 animate-in zoom-in duration-300" />
            ) : (
              <Mail className="h-12 w-12 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {success ? "Email Sent!" : "Verify your email"}
          </CardTitle>
          <CardDescription className="mt-2 text-muted-foreground">
            {success
              ? `We've resent a new verification link to ${email}.`
              : `We've sent a verification link to ${email || "your email address"}. Please check your inbox and click the link to activate your account.`}
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full font-semibold" variant="outline">
            <Link href={toSignInPath(redirect)}>Back to Sign In</Link>
          </Button>

          <div className="w-full flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Didn’t receive the email?
            </p>
            <LoadingButton
              onClick={handleResend}
              loading={loading}
              disabled={cooldown > 0}
              variant="ghost"
              size="sm"
              className="text-primary font-medium hover:text-primary hover:bg-primary/5"
            >
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend verification email"}
            </LoadingButton>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
