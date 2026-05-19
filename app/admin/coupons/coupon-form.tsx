"use client";

import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller, type Resolver } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Percent, Tag, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CouponInputSchema } from "@/lib/validator";
import { createCoupon, updateCoupon } from "@/lib/actions/coupon.actions";
import { ICouponInput } from "@/types";
import { DiscountType } from "@/lib/db/models/coupon.model";
import SubmitButton from "@/components/shared/submit-button";
import { FormError } from "@/components/shared/form-error";

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
  }
};

const couponDefaultValues: ICouponInput = {
  code: "",
  discountType: DiscountType.PERCENTAGE,
  discountValue: 0,
  minPurchase: 0,
  expiryDate: undefined,
  maxUsage: 0,
  tier: "free",
  usageLimitPerUser: 0,
  isSponsored: false,
  isPublished: true,
};

const CouponForm = ({
  type,
  coupon,
  couponId,
}: {
  type: "Create" | "Update";
  coupon?: ICouponInput;
  couponId?: string;
}) => {
  const router = useRouter();

  const form = useForm<ICouponInput>({
    resolver: zodResolver(CouponInputSchema) as Resolver<ICouponInput>,
    defaultValues: coupon && type === "Update" ? coupon : couponDefaultValues,
  });

  async function onSubmit(values: ICouponInput) {
    const formattedValues = {
      ...values,
      code: values.code.toUpperCase().trim(),
      expiryDate: values.expiryDate ? new Date(values.expiryDate) : undefined,
    };

    let res;
    if (type === "Create") {
      res = await createCoupon(formattedValues);
    } else {
      if (!couponId) {
        router.push(`/admin/coupons`);
        return;
      }
      res = await updateCoupon({
        ...formattedValues,
        _id: couponId,
      });
    }

    if (!res.success) {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as keyof ICouponInput, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || `Failed to ${type.toLowerCase()} coupon`);
    } else {
      toast.success(`Coupon ${type}d Successfully!`);
      router.push(`/admin/coupons`);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        method="post"
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={handleKeyDown}
        className="space-y-6"
      >
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Tag className="h-6 w-6 text-primary" />
              {type} Coupon
            </CardTitle>

            <CardDescription>
              Create discount coupons for your customers
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coupon Code */}
              <Controller
                control={form.control}
                name="code"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Coupon Code</FieldLabel>

                    
                      <div className="relative">
                        <Tag className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />

                        <Input
                          aria-invalid={fieldState.invalid} {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                          placeholder="SUMMER2026"
                          className="pl-10 h-12 uppercase tracking-wider font-semibold"
                        />
                      </div>
                    

                    <FieldDescription>
                      Coupon code will automatically be capitalized
                    </FieldDescription>

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Discount Type */}
              <Controller
                control={form.control}
                name="discountType"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Discount Type</FieldLabel>

                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      
                        <SelectTrigger className="h-16 cursor-pointer" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select discount type" />
                        </SelectTrigger>
                      

                      <FieldDescription>
                        Select percentage or fixed amount.
                      </FieldDescription>

                      <SelectContent>
                        <SelectItem
                          value="percentage"
                          className="cursor-pointer"
                        >
                          Percentage (%)
                        </SelectItem>

                        <SelectItem value="fixed" className="cursor-pointer">
                          Fixed Amount (KES)
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Discount Value */}
              <Controller
                control={form.control}
                name="discountValue"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Discount Value</FieldLabel>

                    
                      <div className="relative">
                        <Percent className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />

                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          onKeyDown={(e) => {
                            if (e.key === "-") {
                              e.preventDefault();
                            }
                          }}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                          placeholder="10"
                          className="pl-10 h-12"
                        />
                      </div>
                    

                    <FieldDescription>
                      Set the discount percentage or fixed amount.
                    </FieldDescription>

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Minimum Purchase */}
              <Controller
                control={form.control}
                name="minPurchase"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Minimum Purchase</FieldLabel>

                    
                      <div className="relative">
                        <Wallet className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />

                        <Input
                          type="number"
                          min={0}
                          step="5"
                          onKeyDown={(e) => {
                            if (e.key === "-") {
                              e.preventDefault();
                            }
                          }}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                          placeholder="1000"
                          className="pl-10 h-12"
                        />
                      </div>
                    

                    <FieldDescription>
                      Optional minimum cart amount required
                    </FieldDescription>

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Expiry Date */}
              <Controller
                control={form.control}
                name="expiryDate"
                render={({ field, fieldState }) => (
                  <Field className="flex flex-col" data-invalid={fieldState.invalid}>
                    <FieldLabel>Expiry Date</FieldLabel>

                    <Popover>
                      <PopoverTrigger asChild>
                        
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-12 justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />

                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select expiry date</span>
                            )}
                          </Button>
                        
                      </PopoverTrigger>

                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <FieldDescription>Leave empty for no expiry</FieldDescription>

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Usage Limit */}
              <Controller
                control={form.control}
                name="maxUsage"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Usage Limit</FieldLabel>

                    
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        onKeyDown={(e) => {
                          if (e.key === "-") {
                            e.preventDefault();
                          }
                        }}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                        placeholder="100"
                        className="h-12"
                      />
                    

                    <FieldDescription>
                      Maximum number of times this coupon can be used
                    </FieldDescription>

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Tier */}
              <Controller
                control={form.control}
                name="tier"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Tier</FieldLabel>

                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      
                        <SelectTrigger className="h-12 cursor-pointer" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                      

                      <SelectContent>
                        <SelectItem value="free" className="cursor-pointer">
                          Free
                        </SelectItem>
                        <SelectItem value="premium" className="cursor-pointer">
                          Premium
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/* Usage Limit Per User */}
              <Controller
                control={form.control}
                name="usageLimitPerUser"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Usage Limit Per User</FieldLabel>

                    
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        onKeyDown={(e) => {
                          if (e.key === "-") {
                            e.preventDefault();
                          }
                        }}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                        placeholder="1"
                        className="h-12"
                      />
                    

                    <FieldDescription>
                      How many times a single user can use this coupon
                    </FieldDescription>

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <div className="flex gap-6">
              {/* Sponsored Status */}
              <Controller
                control={form.control}
                name="isSponsored"
                render={({ field, fieldState }) => (
                  <Field className="flex items-center space-x-2 cursor-pointer" data-invalid={fieldState.invalid}>
                    
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="cursor-pointer"
                      />
                    
                    <FieldLabel className="cursor-pointer">
                      Is Sponsored?
                    </FieldLabel>
                  </Field>
                )}
              />

              {/* Active Status */}
              <Controller
                control={form.control}
                name="isPublished"
                render={({ field, fieldState }) => (
                  <Field className="flex items-center space-x-2 cursor-pointer" data-invalid={fieldState.invalid}>
                    
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="cursor-pointer"
                      />
                    
                    <FieldLabel className="cursor-pointer">
                      Is Published?
                    </FieldLabel>
                  </Field>
                )}
              />

              {/* Submit Button */}
            </div>

            <FormError message={form.formState.errors.root?.message} />

            <SubmitButton
              type="submit"
              isLoading={form.formState.isSubmitting}
              className="button col-span-2 w-full cursor-pointer"
              loadingText="Submitting..."
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {type} Coupon
            </SubmitButton>
          </CardContent>
        </Card>
      </form>
    </FormProvider>
  );
};

export default CouponForm;
