"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AffiliateInputSchema } from "@/lib/validator";
import { registerAffiliate } from "@/lib/actions/affiliate.actions";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Breadcrumb from "@/components/shared/breadcrumb";
import { FormError } from "@/components/shared/form-error";

import { getAffiliateStatus } from "@/lib/actions/affiliate.actions";
import { AlertCircle, Loader2 } from "lucide-react";
import { LoadingButton } from "@/components/shared/loading-button";

const defaultValues = {
  affiliateCode: "",
  paymentDetails: {
    bankName: "",
    accountName: "",
    accountNumber: "",
    payPalEmail: "",
    mPesaNumber: "",
  },
};
type AffiliateFormValues = typeof defaultValues;

export default function RegisterAffiliatePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [rejectionNote, setRejectionNote] = useState("");

  const form = useForm<AffiliateFormValues>({
    resolver: zodResolver(AffiliateInputSchema) as Resolver<AffiliateFormValues>,
    defaultValues,
  });

  useEffect(() => {
    async function checkStatus() {
      const status = await getAffiliateStatus();

      if (!status.exists) {
        setCheckingStatus(false);
        return;
      }

      if (status.status !== "rejected") {
        router.push("/affiliate/dashboard");
        return;
      }

      form.reset({
        affiliateCode: status.affiliateCode || "",
        paymentDetails: {
          ...defaultValues.paymentDetails,
          ...(status.paymentDetails || {}),
        },
      });
      setRejectionNote(status.adminNote || "");
      setCheckingStatus(false);
    }

    checkStatus();
  }, [form, router]);

  async function onSubmit(values: AffiliateFormValues) {
    setIsSubmitting(true);
    const res = await registerAffiliate(values);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      router.push("/affiliate/dashboard");
    } else {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as any, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || "Failed to register affiliate");
    }
  }

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <Breadcrumb />

      <section className="flex-1 flex flex-col items-center justify-center md:px-6 py-12 bg-linear-to-br from-primary/5 to-muted/5">
        <div className="text-center space-y-6 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary">
            Become an Affiliate
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Join our affiliate program and start earning commissions today.
          </p>

          {rejectionNote && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p>
                <strong>Previous application feedback:</strong> {rejectionNote}
              </p>
            </div>
          )}
        </div>

        {/* Optional: Add some subtle decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-12.5 w-50 h-50 bg-primary/5 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 -right-12.5 w-50 h-50 bg-secondary/5 rounded-full blur-3xl animate-pulse-slow"></div>
        </div>
      </section>

      <section className="flex-1">
        <div className="container mx-auto max-w-2xl md:px-6 py-4 md:py-8">
          <Card className="border bg-card/50 backdrop-blur">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold">
                Application Form
              </CardTitle>
              <p className="text-muted-foreground">
                Tell us about yourself and how you plan to promote our products.
              </p>
            </CardHeader>
            <CardContent>
              <FormProvider {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <Controller
                    control={form.control}
                    name="affiliateCode"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Unique Affiliate Code</FieldLabel>
                        
                          <Input
                            placeholder="e.g. john-deals"
                            aria-invalid={fieldState.invalid} {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value.toUpperCase());
                            }}
                          />
                        
                        <FieldError  errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Payment Details</h3>
                    <p className="text-sm text-muted-foreground">
                      Provide at least one payment method where you&apos;d like
                      to receive your earnings.
                    </p>

                    <Controller
                      control={form.control}
                      name="paymentDetails.mPesaNumber"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>M-Pesa Number</FieldLabel>
                          
                            <Input placeholder="e.g. 0712345678" aria-invalid={fieldState.invalid} {...field} />
                          
                          <FieldError  errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="paymentDetails.payPalEmail"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>PayPal Email</FieldLabel>
                          
                            <Input
                              type="email"
                              placeholder="e.g. john@example.com"
                              aria-invalid={fieldState.invalid} {...field}
                            />
                          
                          <FieldError  errors={[fieldState.error]} />
                        </Field>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-muted/50">
                      <div className="col-span-full font-medium">
                        Bank Details (Optional)
                      </div>
                      <Controller
                        control={form.control}
                        name="paymentDetails.bankName"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Bank Name</FieldLabel>
                            
                              <Input aria-invalid={fieldState.invalid} {...field} />
                            
                            <FieldError  errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                      <Controller
                        control={form.control}
                        name="paymentDetails.accountName"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Account Name</FieldLabel>
                            
                              <Input aria-invalid={fieldState.invalid} {...field} />
                            
                            <FieldError  errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                      <Controller
                        control={form.control}
                        name="paymentDetails.accountNumber"
                        render={({ field, fieldState }) => (
                          <Field className="col-span-full" data-invalid={fieldState.invalid}>
                            <FieldLabel>Account Number</FieldLabel>
                            
                              <Input aria-invalid={fieldState.invalid} {...field} />
                            
                            <FieldError  errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                    </div>
                  </div>

                  <FormError message={form.formState.errors.root?.message} />

                  <LoadingButton
                    type="submit"
                    className="w-full font-semibold px-8 py-3"
                    loading={isSubmitting}
                    loadingText="Submitting..."
                    disabled={isSubmitting}
                  >
                    Submit Application
                  </LoadingButton>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
