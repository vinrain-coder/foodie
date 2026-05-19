"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import Image from "next/image";
import { UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { Trash2, Plus, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Checkbox } from "@/components/ui/checkbox";

import { ISettingInput } from "@/types";
import MediaUploader from "@/components/shared/media-uploader";
import DeleteDialog from "@/components/shared/delete-dialog";

export default function CarouselForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "carousels",
  });

  const {
    watch,
    formState: { errors },
  } = form;

  return (
    <div id={id}>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Carousels</CardTitle>

          <Button
            type="button"
            size="sm"
            className="gap-1"
            onClick={() =>
              append({
                url: "",
                title: "",
                image: "",
                buttonCaption: "",
                isPublished: true,
              })
            }
          >
            <Plus className="w-4 h-4" />
            Add Carousel
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {fields.map((field, index) => {
            const image = watch(`carousels.${index}.image`);

            return (
              <div key={field.id} className="rounded-lg border p-3 space-y-3">
                {/* Top Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">#{index + 1}</p>
                    <Controller
                      control={form.control}
                      name={`carousels.${index}.isPublished`}
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
                  </div>

                  <DeleteDialog
                    id={field.id}
                    title="Delete carousel?"
                    description="This carousel item will be removed from the form."
                    triggerLabel="Remove carousel"
                    onDelete={async () => {
                      remove(index);
                      return {
                        success: true,
                        message: "Carousel removed",
                      };
                    }}
                  />
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Title */}
                  <Controller
                    control={form.control}
                    name={`carousels.${index}.title`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs">Title</FieldLabel>

                        
                          <Input
                            aria-invalid={fieldState.invalid} {...field}
                            placeholder="Title"
                            className="h-9"
                          />
                        

                        <FieldError>
                          {errors.carousels?.[index]?.title?.message}
                        </FieldError>
                      </Field>
                    )}
                  />

                  {/* URL */}
                  <Controller
                    control={form.control}
                    name={`carousels.${index}.url`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs">URL</FieldLabel>

                        
                          <Input
                            aria-invalid={fieldState.invalid} {...field}
                            placeholder="/search"
                            className="h-9"
                          />
                        

                        <FieldError>
                          {errors.carousels?.[index]?.url?.message}
                        </FieldError>
                      </Field>
                    )}
                  />

                  {/* Caption */}
                  <Controller
                    control={form.control}
                    name={`carousels.${index}.buttonCaption`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs">Button Text</FieldLabel>

                        
                          <Input
                            aria-invalid={fieldState.invalid} {...field}
                            placeholder="Shop Now"
                            className="h-9"
                          />
                        

                        <FieldError>
                          {errors.carousels?.[index]?.buttonCaption?.message}
                        </FieldError>
                      </Field>
                    )}
                  />
                </div>

                {/* Image */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 items-start">
                  <Controller
                    control={form.control}
                    name={`carousels.${index}.image`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs">Image URL</FieldLabel>

                        
                          <Input
                            aria-invalid={fieldState.invalid} {...field}
                            placeholder="Paste image URL"
                            className="h-9"
                          />
                        

                        <FieldError  errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  {image ? (
                    <div className="relative overflow-hidden rounded-md border">
                      <Image
                        src={image}
                        alt="Preview"
                        width={220}
                        height={80}
                        className="h-20 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-md p-3 flex items-center justify-center">
                      <MediaUploader
                        form={form}
                        label="Carousel image"
                        name={`carousels.${index}.image`}
                        uploadRoute="carousels"
                        maxFiles={1}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
