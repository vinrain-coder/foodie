import { Field, FieldLabel, FieldError } from "@/components/ui/field";
 
import DeleteDialog from "@/components/shared/delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ISettingInput } from "@/types";
import { TrashIcon } from "lucide-react";
import React, { useEffect } from "react";
import { useFieldArray, UseFormReturn, Controller } from "react-hook-form";

export default function DeliveryDateForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "availableDeliveryDates",
  });
  const {
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  const availableDeliveryDates = watch("availableDeliveryDates");
  const defaultDeliveryDate = watch("defaultDeliveryDate");

  useEffect(() => {
    const validCodes = availableDeliveryDates.map((lang) => lang.name);
    if (!validCodes.includes(defaultDeliveryDate)) {
      setValue("defaultDeliveryDate", "");
    }
  }, [JSON.stringify(availableDeliveryDates)]);

  return (
    <div id={id}>
      <Card>
        <CardHeader>
          <CardTitle>Delivery Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Controller
                  control={form.control}
                  name={`availableDeliveryDates.${index}.name`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      {index == 0 && <FieldLabel>Name</FieldLabel>}
                      
                        <Input aria-invalid={fieldState.invalid} {...field} placeholder="Name" />
                      
                      <FieldError>
                        {errors.availableDeliveryDates?.[index]?.name?.message}
                      </FieldError>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`availableDeliveryDates.${index}.daysToDeliver`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      {index == 0 && <FieldLabel>Days</FieldLabel>}
                      
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          onKeyDown={(e) => {
                            if (e.key === "-") {
                              e.preventDefault();
                            }
                          }}
                          placeholder="daysToDeliver"
                        />
                      
                      <FieldError>
                        {
                          errors.availableDeliveryDates?.[index]?.daysToDeliver
                            ?.message
                        }
                      </FieldError>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`availableDeliveryDates.${index}.shippingPrice`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      {index == 0 && <FieldLabel>Shipping Price</FieldLabel>}
                      
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          onKeyDown={(e) => {
                            if (e.key === "-") {
                              e.preventDefault();
                            }
                          }}
                          {...field}
                          placeholder="shippingPrice"
                        />
                      
                      <FieldError>
                        {
                          errors.availableDeliveryDates?.[index]?.shippingPrice
                            ?.message
                        }
                      </FieldError>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`availableDeliveryDates.${index}.freeShippingMinPrice`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      {index == 0 && <FieldLabel>Free Shipping</FieldLabel>}
                      
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          onKeyDown={(e) => {
                            if (e.key === "-") {
                              e.preventDefault();
                            }
                          }}
                          placeholder="freeShippingMinPrice"
                        />
                      
                      <FieldError>
                        {
                          errors.availableDeliveryDates?.[index]
                            ?.freeShippingMinPrice?.message
                        }
                      </FieldError>
                    </Field>
                  )}
                />
                <div>
                  {index == 0 && <div className="">Action</div>}
                  <DeleteDialog
                    id={field.id}
                    title="Delete delivery date?"
                    description="This delivery date will be removed from the form."
                    triggerLabel="Remove delivery date"
                    onDelete={async () => {
                      remove(index);

                      return {
                        success: true,
                        message: "Delivery date removed",
                      };
                    }}
                  />
                </div>{" "}
              </div>
            ))}

            <Button
              className="cursor-pointer"
              type="button"
              variant={"outline"}
              onClick={() =>
                append({
                  name: "",
                  daysToDeliver: 0,
                  shippingPrice: 0,
                  freeShippingMinPrice: 0,
                })
              }
            >
              Add DeliveryDate
            </Button>
          </div>

          <Controller
            control={control}
            name="defaultDeliveryDate"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Default DeliveryDate</FieldLabel>
                
                  <Select
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger className="cursor-pointer" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select a delivery date" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDeliveryDates
                        .filter((x) => x.name)
                        .map((lang, index) => (
                          <SelectItem
                            key={index}
                            value={lang.name}
                            className="cursor-pointer"
                          >
                            {lang.name} ({lang.shippingPrice})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                
                <FieldError>{errors.defaultDeliveryDate?.message}</FieldError>
              </Field>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
