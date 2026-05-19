"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserSession } from "@/lib/coupons/access-control";
import { Crown, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import { loadPaystackScript } from "@/app/checkout/paystack-loader";
import { authClient } from "@/lib/auth-client";

export function UpgradeButton({
  user,
  price,
}: {
  user: UserSession | null;
  price: number;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [successStep, setSuccessStep] = useState(false);
  const router = useRouter();

  // Handle unauthenticated users - redirect to sign in
  if (!user) {
    return (
      <Button
        className="w-full rounded-2xl bg-linear-to-r from-amber-500 to-yellow-500 text-white font-bold py-6 px-8 text-lg shadow-lg shadow-amber-200/30 transition-all duration-200 hover:from-amber-600 hover:to-yellow-600 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
        onClick={() => {
          const callbackUrl = encodeURIComponent("/coupons?upgrade=true");
          router.push(`/sign-in?callbackUrl=${callbackUrl}`);
        }}
      >
        <Crown className="h-6 w-6" />
        Upgrade to Premium
      </Button>
    );
  }

  const onSuccess = (reference: any) => {
    setLoading(true);

    fetch("/api/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: reference.reference }),
      cache: "no-store",
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.status) {
          setSuccessStep(true);
          toast.success("Successfully upgraded to Premium!");
          // Invalidate Better Auth cookie cache by fetching fresh session
          await authClient.getSession({
            query: {
              disableCookieCache: true,
            },
          });
          // Force router refresh to re-render server components with fresh session
          router.refresh();
          // Close dialog after brief success animation
          setTimeout(() => {
            setOpen(false);
            setSuccessStep(false);
          }, 2000);
        } else {
          toast.error(data.message || "Verification failed");
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("An error occurred while verifying payment");
        setLoading(false);
      })
      .finally(() => {
        if (!successStep) setLoading(false);
      });
  };

  const handlePayment = async () => {
    setLoading(true);
    setSuccessStep(false);
    setOpen(false);

    try {
      await loadPaystackScript();

      const PaystackPop = (window as any)?.PaystackPop;

      if (!PaystackPop) {
        throw new Error("Paystack script failed to load");
      }

      const popup = new PaystackPop();

      popup.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: user.email,
        amount: price * 100,
        currency: "KES",
        reference: `${user.id || user._id}-${Date.now()}`,
        metadata: {
          userId: user.id || user._id,
          type: "membership_subscription",
          plan: "monthly",
        },

        onSuccess: (response: any) => {
          onSuccess(response);
        },

        onCancel: () => {
          setLoading(false);
          toast("Payment cancelled");
        },
      });
    } catch (error) {
      console.error(error);
      toast.error("Paystack failed to load. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full rounded-2xl bg-linear-to-r from-amber-500 to-yellow-500 text-white font-bold py-6 px-8 text-lg shadow-lg shadow-amber-200/30 transition-all duration-200 hover:from-amber-600 hover:to-yellow-600 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]">
          <Crown className="h-6 w-6" />
          Upgrade to Premium
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <span>Upgrade to Premium</span>
          </DialogTitle>
          <DialogDescription className="mt-3">
            Unlock unlimited access to premium coupons and features for{" "}
            <span className="font-semibold">{formatCurrency(price)}/month</span>
            .
          </DialogDescription>
        </DialogHeader>

        {/* Success Step */}
        {successStep && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl">You're All Set! 🎉</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Your premium membership has been activated. You now have access to
              all premium coupons and exclusive features.
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          </div>
        )}

        {!successStep && (
          <>
            {/* Feature list */}
            <div className="space-y-3 py-4">
              {[
                "Unlimited access to premium coupons",
                "Exclusive member-only deals",
                "Early access to new promotions",
                "Priority customer support",
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Separator className="my-2" />

            <div className="py-2 text-sm text-muted-foreground">
              You will be redirected to a secure payment page to complete your
              subscription. Cancel anytime.
            </div>

            <DialogFooter>
              <Button
                onClick={handlePayment}
                disabled={loading}
                className="w-full rounded-2xl bg-linear-to-r from-amber-500 to-yellow-500 text-white font-bold hover:from-amber-600 hover:to-yellow-600 shadow-md shadow-amber-200/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment…
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Pay {formatCurrency(price)}/month
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
