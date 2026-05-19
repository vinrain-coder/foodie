import { Field, FieldLabel, FieldError } from "@/components/ui/field";
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

export default function CurrencyForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "availableCurrencies",
  });
  const {
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  const availableCurrencies = watch("availableCurrencies");
  const defaultCurrency = watch("defaultCurrency");

  useEffect(() => {
    const validCodes = availableCurrencies.map((lang) => lang.code);
    if (!validCodes.includes(defaultCurrency)) {
      setValue("defaultCurrency", "");
    }
     
  }, [JSON.stringify(availableCurrencies)]);

  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>Currencies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex   gap-2">
              <Controller
                control={form.control}
                name={`availableCurrencies.${index}.name`}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    {" "}
                    {index == 0 && <FieldLabel>Name</FieldLabel>}
                    
                      <Input aria-invalid={fieldState.invalid} {...field} placeholder="Name" />
                    
                    <FieldError>
                      {errors.availableCurrencies?.[index]?.name?.message}
                    </FieldError>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name={`availableCurrencies.${index}.code`}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    {index == 0 && <FieldLabel>Code</FieldLabel>}
                    
                      <Input aria-invalid={fieldState.invalid} {...field} placeholder="Code" />
                    
                    <FieldError>
                      {errors.availableCurrencies?.[index]?.code?.message}
                    </FieldError>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name={`availableCurrencies.${index}.symbol`}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    {index == 0 && <FieldLabel>Symbol</FieldLabel>}
                    
                      <Input aria-invalid={fieldState.invalid} {...field} placeholder="Symbol" />
                    
                    <FieldError>
                      {errors.availableCurrencies?.[index]?.symbol?.message}
                    </FieldError>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name={`availableCurrencies.${index}.convertRate`}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    {index == 0 && <FieldLabel>Convert Rate</FieldLabel>}
                    
                      <Input aria-invalid={fieldState.invalid} {...field} placeholder="Convert Rate" />
                    
                    <FieldError>
                      {
                        errors.availableCurrencies?.[index]?.convertRate
                          ?.message
                      }
                    </FieldError>
                  </Field>
                )}
              />
              <div>
                {index == 0 && <div>Action</div>}
                <Button
                  type="button"
                  disabled={fields.length === 1}
                  variant="outline"
                  className={index == 0 ? "mt-2" : ""}
                  onClick={() => {
                    remove(index);
                  }}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant={"outline"}
            onClick={() =>
              append({ name: "", code: "", symbol: "", convertRate: 1 })
            }
          >
            Add Currency
          </Button>
        </div>

        <Controller
          control={control}
          name="defaultCurrency"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Default Currency</FieldLabel>
              
                <Select
                  value={field.value || ""}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies
                      .filter((x) => x.code)
                      .map((lang, index) => (
                        <SelectItem key={index} value={lang.code}>
                          {lang.name} ({lang.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              
              <FieldError>{errors.defaultCurrency?.message}</FieldError>
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}