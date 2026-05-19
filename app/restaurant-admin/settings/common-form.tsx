import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { THEMES } from "@/lib/constants";
import { ISettingInput } from "@/types";
import { UseFormReturn, Controller } from "react-hook-form";

export default function CommonForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id: string;
}) {
  const { control } = form;

  return (
    <div id={id}>
      <Card>
        <CardHeader>
          <CardTitle>Common Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="common.pageSize"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Page Size</FieldLabel>
                  
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      onKeyDown={(e) => {
                        if (e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Enter Page Size"
                      {...field}
                    />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="common.freeShippingMinPrice"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Free Shipping Minimum Price</FieldLabel>
                  
                    <Input
                      type="number"
                      min={0}
                      step="50"
                      onKeyDown={(e) => {
                        if (e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Enter Free Shipping Minimum Price"
                      {...field}
                    />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="common.firstPurchaseDiscountRate"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>First Purchase Discount Rate (%)</FieldLabel>
                  
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="20.00"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  
                  <FieldDescription className="text-[0.8rem] text-muted-foreground">
                    Automatically applied once to first-time buyers (e.g. 5 for
                    5% off items).
                  </FieldDescription>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="common.coinsRewardRate"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Coins Reward Rate (%) (Global)</FieldLabel>
                  
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="4.00"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  
                  <FieldDescription className="text-[0.8rem] text-muted-foreground">
                    Percentage of gross items price awarded as coins (e.g. 4 for
                    4%).
                  </FieldDescription>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="common.taxRate"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Tax Rate (%) (Global)</FieldLabel>
                  
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0.00"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  
                  <FieldDescription className="text-[0.8rem] text-muted-foreground">
                    Sales tax percentage applied to items price (e.g. 16 for
                    16%).
                  </FieldDescription>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="common.defaultTheme"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel className="cursor-pointer">
                    Default Theme
                  </FieldLabel>
                  
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger className="cursor-pointer" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                      <SelectContent>
                        {THEMES.map((theme, index) => (
                          <SelectItem
                            key={index}
                            value={theme}
                            className="cursor-pointer"
                          >
                            {theme}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  
                  <FieldDescription className="text-[0.8rem] text-muted-foreground">
                    Theme applied by default to new users. Users can change it
                    in their profile settings.
                  </FieldDescription>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="common.premiumMembershipPrice"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Premium Membership Price</FieldLabel>
                  
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      onKeyDown={(e) => {
                        if (e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  
                  <FieldDescription className="text-[0.8rem] text-muted-foreground">
                    Price for users to subscribe to premium membership (e.g. 500
                    for KSh 500/month).
                  </FieldDescription>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <div>
            <Controller
              control={control}
              name="common.isMaintenanceMode"
              render={({ field, fieldState }) => (
                <Field className="flex space-x-2 items-center cursor-pointer" data-invalid={fieldState.invalid}>
                  
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="cursor-pointer"
                    />
                  
                  <FieldLabel className="cursor-pointer">
                    Maintenance Mode?
                  </FieldLabel>
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
