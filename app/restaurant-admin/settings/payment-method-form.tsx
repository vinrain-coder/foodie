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
} from "@/components/ui/select";
import { ISettingInput } from "@/types";
import { TrashIcon } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, UseFormReturn, Controller } from "react-hook-form";

export default function PaymentMethodForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "availablePaymentMethods",
  });
  const {
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  const availablePaymentMethods = watch("availablePaymentMethods");
  const defaultPaymentMethod = watch("defaultPaymentMethod");

  useEffect(() => {
    const validCodes = availablePaymentMethods.map((lang) => lang.name);
    if (!validCodes.includes(defaultPaymentMethod)) {
      setValue("defaultPaymentMethod", "");
    }
     
  }, [JSON.stringify(availablePaymentMethods)]);

  return (
    <div id={id}>
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex   gap-2">
                <Controller
                  control={form.control}
                  name={`availablePaymentMethods.${index}.name`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      {index == 0 && <FieldLabel>Name</FieldLabel>}
                      
                        <Input aria-invalid={fieldState.invalid} {...field} placeholder="Name" />
                      
                      <FieldError>
                        {errors.availablePaymentMethods?.[index]?.name?.message}
                      </FieldError>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name={`availablePaymentMethods.${index}.commission`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      {index == 0 && <FieldLabel>Commission</FieldLabel>}
                      
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          onKeyDown={(e) => {
                            if (e.key === "-") {
                              e.preventDefault();
                            }
                          }}
                          {...field}
                          placeholder="Commission"
                        />
                      
                      <FieldError>
                        {
                          errors.availablePaymentMethods?.[index]?.commission
                            ?.message
                        }
                      </FieldError>
                    </Field>
                  )}
                />
                <div>
                  {index == 0 && <div>Action</div>}
                  <DeleteDialog
                    id={field.id}
                    title="Delete payment method?"
                    description="This payment method will be removed from the form."
                    triggerLabel="Remove payment method"
                    onDelete={async () => {
                      remove(index);

                      return {
                        success: true,
                        message: "Payment method removed",
                      };
                    }}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant={"outline"}
              onClick={() =>
                append({ name: "", commission: 0, isPublished: true })
              }
            >
              Add PaymentMethod
            </Button>
          </div>

          <Controller
            control={control}
            name="defaultPaymentMethod"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Default PaymentMethod</FieldLabel>
                
                  <Select
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger className="w-full cursor-pointer" aria-invalid={fieldState.invalid}>
                      <div className="flex w-full items-center overflow-hidden">
                        <span className="truncate" title={field.value}>
                          {field.value || "Select a payment method"}
                        </span>
                      </div>
                    </SelectTrigger>

                    <SelectContent>
                      {availablePaymentMethods
                        .filter((x) => x.name)
                        .map((lang, index) => (
                          <SelectItem
                            key={index}
                            value={lang.name}
                            className="cursor-pointer"
                          >
                            {lang.name} ({lang.commission}%)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                
                <FieldError>
                  {errors.defaultPaymentMethod?.message}
                </FieldError>
              </Field>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
