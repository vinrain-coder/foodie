"use client";

import {
  loadPaystackScript,
  PaystackTransactionReference,
} from "@/app/checkout/paystack-loader";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PaystackInlineProps {
  email: string;
  amount: number;
  publicKey: string;
  orderId: string;
  onSuccess?: (reference: PaystackTransactionReference) => void;
  onClose?: () => void;
  onFailure?: (error?: unknown) => void;
  buttonLabel?: string;
  className?: string;
  metadata?: Record<string, unknown>;
}

export default function PaystackInline({
  email,
  amount,
  publicKey,
  orderId,
  onSuccess,
  onClose,
  onFailure,
  buttonLabel = "Pay Now",
  className,
  metadata,
}: PaystackInlineProps) {
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  // Load script once
  useEffect(() => {
    let mounted = true;

    loadPaystackScript()
      .then(() => mounted && setScriptReady(true))
      .catch(() => toast.error("Failed to load Paystack"));

    return () => {
      mounted = false;
    };
  }, []);

  const verifyPayment = async (reference: string) => {
    try {
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, orderId }),
      });

      const data = await res.json();

      if (data?.status) {
        toast.success("Payment successful!");
        return true;
      }

      toast.error(data?.message || "Payment verification failed");
      return false;
    } catch (err) {
      toast.error("Verification error");
      return false;
    }
  };

  const handlePayment = useCallback(async () => {
    if (!email || !amount || !publicKey) {
      toast.error("Missing payment details");
      return;
    }

    if (!scriptReady || !(window as any).PaystackPop) {
      toast.error("Payment system not ready");
      return;
    }

    setLoading(true);

    const PaystackPop = (window as any).PaystackPop;

    // Paystack InlineJS v2 Pattern
    const popup = new PaystackPop();

    popup.newTransaction({
      key: publicKey,
      email,
      amount: Math.round(amount),
      currency: "KES",
      reference:
        typeof metadata?.reference === "string" && metadata.reference.trim()
          ? metadata.reference
          : `${orderId}-${Date.now()}`,

      metadata: {
        orderId,
        ...metadata,
      },

      onCancel: () => {
        setLoading(false);
        toast.info("Payment cancelled");
        onClose?.();
      },

      onSuccess: async (response: PaystackTransactionReference) => {
        setLoading(true);

        const success = await verifyPayment(response.reference);

        setLoading(false);

        if (success) {
          onSuccess?.(response);
        } else {
          onFailure?.(response);
        }
      },
    });
  }, [
    amount,
    email,
    metadata,
    orderId,
    publicKey,
    scriptReady,
    onClose,
    onSuccess,
    onFailure,
  ]);

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePayment}
        disabled={loading || !scriptReady}
        className={
          className ?? "w-full rounded-full px-6 py-6 text-lg font-bold"
        }
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : !scriptReady ? (
          "Loading payment..."
        ) : (
          buttonLabel
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Secure payment powered by Paystack
      </p>
    </div>
  );
}
