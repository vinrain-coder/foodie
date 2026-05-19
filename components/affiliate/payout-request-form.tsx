"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AffiliatePayoutInputSchema } from "@/lib/validator";
import { z } from "zod";

import { createPayoutRequest } from "@/lib/actions/affiliate.actions";

import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FormError } from "../shared/form-error";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { LoadingButton } from "../shared/loading-button";
import {
  Wallet,
  DollarSign,
  Building2,
  Info,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "../ui/alert";

type AffiliatePayoutInput = z.infer<typeof AffiliatePayoutInputSchema>;

const paymentMethodInfo: Record<
  string,
  {
    icon: any;
    description: string;
    processingTime: string;
    placeholder: string;
  }
> = {
  "M-Pesa": {
    icon: Wallet,
    description: "M-Pesa mobile money transfer",
    processingTime: "2-24 hours",
    placeholder: "e.g., 07XXXXXXXX",
  },
  PayPal: {
    icon: DollarSign,
    description: "PayPal account transfer",
    processingTime: "1-3 business days",
    placeholder: "e.g., your@email.com",
  },
  "Bank Transfer": {
    icon: Building2,
    description: "Direct bank deposit (requires full account details)",
    processingTime: "2-5 business days",
    placeholder: "Account number or IBAN",
  },
};

export default function PayoutRequestForm({
  currentBalance,
  minAmount,
}: {
  currentBalance: number;
  minAmount: number;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AffiliatePayoutInput>({
    resolver: zodResolver(AffiliatePayoutInputSchema) as Resolver<AffiliatePayoutInput>,
    defaultValues: {
      amount: Math.max(minAmount, currentBalance),
      paymentMethod: "M-Pesa",
      paymentDetails: {
        recipient: "",
      },
    },
  });

  const selectedMethod = form.watch("paymentMethod");

  async function onSubmit(values: AffiliatePayoutInput) {
    if (values.amount > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (values.amount < minAmount) {
      toast.error(`Minimum withdrawal is ${formatCurrency(minAmount)}`);
      return;
    }

    setIsSubmitting(true);

    const res = await createPayoutRequest(values);

    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      form.reset({
        amount: Math.max(minAmount, currentBalance),
        paymentMethod: "M-Pesa",
        paymentDetails: { recipient: "" },
      });
      router.refresh();
    } else {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as any, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || "Failed to submit payout request");
    }
  }

  const methodInfo = paymentMethodInfo[selectedMethod];

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Request Payout</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  Ensure your payment details are accurate to avoid delays.
                  Payouts are processed within the timeframe shown below.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* AMOUNT FIELD */}
            <Controller
              control={form.control}
              name="amount"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Withdrawal Amount</FieldLabel>
                    <span className="text-xs text-muted-foreground">
                      Available:{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(currentBalance)}
                      </span>
                    </span>
                  </div>
                  
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        KES
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={minAmount}
                        max={currentBalance}
                        className="pl-12 h-11 text-lg font-medium"
                        aria-invalid={fieldState.invalid} {...field}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          field.onChange(val);
                        }}
                      />
                    </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <FieldError  errors={[fieldState.error]} />
                    {currentBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => form.setValue("amount", currentBalance)}
                        className="text-primary hover:underline font-medium"
                      >
                        Withdraw All
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Minimum: {formatCurrency(minAmount)}</span>
                    <span>Max: {formatCurrency(currentBalance)}</span>
                  </div>
                </Field>
              )}
            />

            {/* PAYMENT METHOD SELECT */}
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Payment Method</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    
                      <SelectTrigger className="cursor-pointer h-11" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select a payment method" />
                      </SelectTrigger>
                    
                    <SelectContent>
                      <SelectItem value="M-Pesa" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-600" />
                          <span>M-Pesa</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PayPal" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span>PayPal</span>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="Bank Transfer"
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-600" />
                          <span>Bank Transfer</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            {/* METHOD INFO ALERT */}
            {methodInfo && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs flex flex-col gap-1">
                  <span className="font-medium text-foreground">
                    {methodInfo.description}
                  </span>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Processing: {methodInfo.processingTime}</span>
                  </div>
                </div>
              </div>
            )}

            {/* RECIPIENT FIELD */}
            {selectedMethod !== "Wallet" && (
              <Controller
                control={form.control}
                name="paymentDetails.recipient"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      {selectedMethod === "M-Pesa"
                        ? "Phone Number"
                        : selectedMethod === "PayPal"
                          ? "PayPal Email"
                          : "Account Details"}
                    </FieldLabel>
                    
                      <Input
                        placeholder={methodInfo?.placeholder || "Enter details"}
                        className="h-11"
                        aria-invalid={fieldState.invalid} {...field}
                      />
                    
                    <FieldError  errors={[fieldState.error]} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Double-check this information. Incorrect details may cause
                      delays.
                    </p>
                  </Field>
                )}
              />
            )}

            {/* BALANCE ALERT */}
            {currentBalance < minAmount && (
              <Alert variant="destructive" className="py-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  You need at least {formatCurrency(minAmount)} to request a
                  payout. Earn more commissions to reach the minimum.
                </AlertDescription>
              </Alert>
            )}

            <FormError message={form.formState.errors.root?.message} />

            {/* SUBMIT BUTTON */}
            <LoadingButton
              type="submit"
              className="w-full font-semibold h-11 text-base"
              loading={isSubmitting}
              loadingText="Processing..."
              disabled={
                isSubmitting ||
                !form.formState.isValid ||
                minAmount > currentBalance ||
                !selectedMethod
              }
            >
              Request Payout
            </LoadingButton>

            {/* FOOTER NOTE */}
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              By requesting a payout, you confirm that the payment details
              provided are correct. Payouts are reviewed before being processed.{" "}
              <a
                href="/affiliate/dashboard"
                className="text-primary hover:underline font-medium"
              >
                View earnings history
              </a>
            </p>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

// Helper function for formatting currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
