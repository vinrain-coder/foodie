"use client";

import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn, Controller } from "react-hook-form";
import { ISettingInput } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AffiliateSettingForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id?: string;
}) {
  return (
    <div id={id}>
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            control={form.control}
            name="affiliate.enabled"
            render={({ field, fieldState }) => (
              <Field className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4" data-invalid={fieldState.invalid}>
                
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                
                <div className="space-y-1 leading-none">
                  <FieldLabel className="cursor-pointer">
                    Enable Affiliate Program
                  </FieldLabel>
                  <FieldDescription>
                    Allow users to register and earn commissions.
                  </FieldDescription>
                </div>
              </Field>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="affiliate.commissionRate"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>
                    Global Commission Rate (%) (Global Control)
                  </FieldLabel>
                  
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      onKeyDown={(e) => {
                        if (e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="10"
                      {...field}
                    />
                  
                  <p className="text-[0.8rem] text-muted-foreground">
                    Fixed percentage earned by all affiliates on the gross items
                    price.
                  </p>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="affiliate.defaultDiscountRate"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>
                    Global Discount Rate (%) (Global Control)
                  </FieldLabel>
                  
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      onKeyDown={(e) => {
                        if (e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="5"
                      {...field}
                    />
                  
                  <p className="text-[0.8rem] text-muted-foreground">
                    Fixed percentage discount provided to customers using an
                    affiliate code.
                  </p>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="affiliate.cookieExpiryDays"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Cookie Expiry (Days)</FieldLabel>
                  
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      step="1"
                      onKeyDown={(e) => {
                        if (e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      {...field}
                    />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="affiliate.minWithdrawalAmount"
              render={({ field, fieldState }) => (
                <Field className="col-span-1 md:col-span-2" data-invalid={fieldState.invalid}>
                  <FieldLabel>Minimum Withdrawal Amount</FieldLabel>
                  
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      onKeyDown={(e) => {
                        if (e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="1000"
                      {...field}
                    />
                  
                  <p className="text-[0.8rem] text-muted-foreground">
                    The minimum balance required for an affiliate to request a
                    payout.
                  </p>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
