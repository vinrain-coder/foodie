"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  loadPaystackScript,
  PaystackTransactionReference,
} from "./paystack-loader";

interface PaystackInlineProps {
  email: string;
  amount: number;
  publicKey: string;
  orderId: string;
  onSuccess?: (reference: PaystackTransactionReference) => void;
  onClose?: () => void;
  onFailure?: (error?: unknown) => void;
  autoStart?: boolean;
  hideButton?: boolean;
  buttonLabel?: string;
  className?: string;
  metadata?: Record<string, unknown>;
}

type PaystackStatus =
  | "loading-script"
  | "ready"
  | "opening"
  | "open"
  | "verifying"
  | "script-error";

const autoStartedOrderIds = new Set<string>();

const VERIFY_TIMEOUT = 30000;

type VerifyResponse = {
  status?: boolean;
  data?: { status?: string };
};

function isVerifyResponse(data: unknown): data is VerifyResponse {
  return !!data && typeof data === "object";
}

export default function PaystackInline({
  email,
  amount,
  publicKey,
  orderId,
  onSuccess,
  onClose,
  onFailure,
  autoStart = false,
  hideButton = false,
  buttonLabel = "Pay Now",
  className,
  metadata,
}: PaystackInlineProps) {
  const [status, setStatus] = useState<PaystackStatus>("loading-script");
  const verifyingToastRef = useRef<string | number | null>(null);
  const hasStarted = useRef(false);
  const hasCompleted = useRef(false);

  const isBusy = status === "opening" || status === "verifying";

  /* ---------------- SCRIPT LOADING ---------------- */
  useEffect(() => {
    let mounted = true;

    loadPaystackScript()
      .then(() => mounted && setStatus("ready"))
      .catch(() => {
        setStatus("script-error");
        toast.error("Payment system failed to load");
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- STATUS TEXT ---------------- */
  const statusMessage = useMemo(() => {
    switch (status) {
      case "loading-script":
        return "Preparing secure payment...";
      case "opening":
        return "Opening secure checkout...";
      case "verifying":
        return "Confirming your payment securely...";
      case "script-error":
        return "Payment system unavailable. Try again.";
      default:
        return "Ready to complete payment.";
    }
  }, [status]);

  /* ---------------- CLEANUP ---------------- */
  useEffect(() => {
    hasStarted.current = false;
    hasCompleted.current = false;
  }, [orderId]);

  const dismissToast = useCallback(() => {
    if (verifyingToastRef.current) {
      toast.dismiss(verifyingToastRef.current);
      verifyingToastRef.current = null;
    }
  }, []);

  /* ---------------- VERIFY PAYMENT ---------------- */
  const verifyPayment = async (reference: string) => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, VERIFY_TIMEOUT);

    try {
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, orderId }),
        signal: controller.signal,
      });

      const data = await res.json();

      clearTimeout(timeout);

      if (res.ok && isVerifyResponse(data) && data.status) {
        return true;
      }

      return false;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  };

  /* ---------------- PAYMENT FLOW (PAYSTACK v2) ---------------- */
  const payWithPaystack = useCallback(async () => {
    if (isBusy) return;

    if (!window.PaystackPop) {
      setStatus("loading-script");
      await loadPaystackScript().catch(() => setStatus("script-error"));
    }

    if (!window.PaystackPop) {
      setStatus("script-error");
      toast.error("Paystack unavailable");
      return;
    }

    setStatus("opening");
    hasCompleted.current = false;

    const PaystackPop = (window as any).PaystackPop;

    if (!PaystackPop) {
      setStatus("script-error");
      toast.error("Paystack unavailable");
      return;
    }

    setStatus("opening");

    const handler = PaystackPop.setup({
      key: publicKey,
      email,
      amount,
      currency: "KES",

      reference:
        typeof metadata?.reference === "string"
          ? metadata.reference
          : `${orderId}-${Date.now()}`,

      metadata: {
        orderId,
        ...metadata,
      },

      callback: async (response: any) => {
        hasCompleted.current = true;
        setStatus("verifying");

        dismissToast();
        verifyingToastRef.current = toast.loading("Confirming payment...");

        const success = await verifyPayment(response.reference);

        dismissToast();

        if (success) {
          toast.success("Payment successful!");
          setStatus("ready");
          onSuccess?.(response);
        } else {
          toast.error("Payment verification failed");
          setStatus("ready");
          onFailure?.(response);
        }
      },

      onClose: () => {
        setStatus("ready");
        onClose?.();
        if (!hasCompleted.current) toast.info("Payment cancelled");
      },
    });

    handler.openIframe();
  }, [
    amount,
    dismissToast,
    email,
    isBusy,
    metadata,
    onClose,
    onFailure,
    onSuccess,
    orderId,
    publicKey,
  ]);

  /* ---------------- AUTO START ---------------- */
  useEffect(() => {
    if (!autoStart || hasStarted.current || status !== "ready") return;
    if (autoStartedOrderIds.has(orderId)) return;

    hasStarted.current = true;
    autoStartedOrderIds.add(orderId);
    payWithPaystack();
  }, [autoStart, orderId, status, payWithPaystack]);

  /* ---------------- UI ---------------- */
  if (hideButton) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-primary/5">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />

        <h3 className="mt-3 text-lg font-semibold">
          {status === "verifying"
            ? "Confirming payment..."
            : "Processing order..."}
        </h3>

        <p className="text-sm text-muted-foreground mt-1">{statusMessage}</p>

        {status !== "verifying" && (
          <Button type="button" onClick={payWithPaystack} className="mt-4">
            Continue Payment
          </Button>
        )}

        {status === "verifying" && (
          <div className="flex items-center gap-2 mt-4 text-primary text-sm">
            <ShieldCheck className="h-4 w-4" />
            Secure verification in progress
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={payWithPaystack}
        disabled={isBusy}
        className={
          className ?? "w-full rounded-full px-6 py-6 text-lg font-semibold"
        }
      >
        {status === "loading-script" || status === "opening" ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : null}

        {status === "loading-script"
          ? "Loading payment..."
          : status === "opening"
            ? "Opening checkout..."
            : status === "verifying"
              ? "Verifying payment..."
              : buttonLabel}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {statusMessage}
      </p>
    </div>
  );
}
