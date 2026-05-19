"use client";

import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { useTransition } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSupportTicket } from "@/lib/actions/support.actions";
import { SupportTicketInputSchema } from "@/lib/validator";
import { FormError } from "@/components/shared/form-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LoadingButton } from "../loading-button";

type SupportFormValues = z.infer<typeof SupportTicketInputSchema>;

export default function SupportTicketForm({
  initialName,
  initialEmail,
  onSuccess,
  presentation = "card",
  className,
}: {
  initialName?: string;
  initialEmail?: string;
  onSuccess?: () => void;
  presentation?: "card" | "plain";
  className?: string;
  showHeader?: boolean;
  onSubmitted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(SupportTicketInputSchema),
    defaultValues: {
      name: initialName || "",
      email: initialEmail || "",
      subject: "",
      message: "",
      type: "query",
    },
  });

  const onSubmit = (values: SupportFormValues) => {
    startTransition(async () => {
      const response = await createSupportTicket(values);
      if (!response.success) {
        if (response.errors) {
          Object.entries(response.errors).forEach(([field, messages]) => {
            form.setError(field as keyof SupportFormValues, {
              type: "server",
              message: messages.join(". "),
            });
          });
        }
        toast.error(response.message || "Failed to submit ticket");
        return;
      }

      form.reset({
        ...values,
        subject: "",
        message: "",
        type: "query",
      });
      toast.success(response.message);
      onSuccess?.();
    });
  };

  const showHeader = presentation === "card";

  return (
    <div
      className={cn(
        presentation === "card" && "rounded-2xl border bg-card p-5 shadow-sm",
        className,
      )}
    >
      {showHeader ? (
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold">Contact Support</h2>
          <p className="text-sm text-muted-foreground">
            Submit a ticket and we&apos;ll reply by email.
          </p>
        </div>
      ) : null}
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn("space-y-4", presentation === "plain" ? "pt-5" : "")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Name</FieldLabel>
                  
                    <Input
                      autoComplete="name"
                      placeholder="Your name"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  
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
                      autoComplete="email"
                      placeholder="you@example.com"
                      type="email"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="type"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Request Type</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  
                    <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Choose a request type" />
                    </SelectTrigger>
                  
                  <SelectContent>
                    <SelectItem value="query">Query</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="recommendation">
                      Recommendation
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="subject"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Subject</FieldLabel>
                
                  <Input placeholder="How can we help?" aria-invalid={fieldState.invalid} {...field} />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="message"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Message</FieldLabel>
                
                  <Textarea
                    placeholder="Tell us more"
                    rows={presentation === "plain" ? 4 : 5}
                    aria-invalid={fieldState.invalid} {...field}
                  />
                
                <FieldDescription>
                  Include order details if your request is about a purchase.
                </FieldDescription>
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />

          <FormError message={form.formState.errors.root?.message} />

          <LoadingButton
            type="submit"
            className="w-full"
            loading={isPending}
            disabled={isPending}
          >
            Submit ticket
          </LoadingButton>
        </form>
      </FormProvider>
    </div>
  );
}
