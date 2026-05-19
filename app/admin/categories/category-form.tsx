"use client";

import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Using Textarea for description
import SubmitButton from "@/components/shared/submit-button";
import { FormError } from "@/components/shared/form-error";
import { CategoryInputSchema } from "@/lib/validator";
import { toSlug } from "@/lib/utils";
import { createCategory, updateCategory } from "@/lib/actions/category.actions";
import MediaUploader from "@/components/shared/media-uploader";
import { Checkbox } from "@/components/ui/checkbox";

// Infer values directly from your Zod schema
type CategoryFormValues = z.infer<typeof CategoryInputSchema>;

interface CategoryFormProps {
  type: "Create" | "Update";
  category?: Partial<CategoryFormValues>;
  categoryId?: string;
  categoriesList?: { _id: string; name: string }[];
}

export default function CategoryForm({
  type,
  category,
  categoryId,
  categoriesList = [],
}: CategoryFormProps) {
  const router = useRouter();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryInputSchema) as Resolver<CategoryFormValues>,
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      description: category?.description || "",
      image: category?.image || "",
      isFeatured: category?.isFeatured || false,
      seoTitle: category?.seoTitle || "",
      seoDescription: category?.seoDescription || "",
      seoKeywords: category?.seoKeywords || [],
    },
  });

  const nameValue = form.watch("name");

  // Auto-generate slug from name in Create mode
  useEffect(() => {
    if (type === "Create" && nameValue) {
      form.setValue("slug", toSlug(nameValue), { shouldValidate: true });
    }
  }, [nameValue, form, type]);

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      // Ensure "parent" is sent as null if empty, to match MongoId.nullable()
      const formattedValues = {
        ...values,
      };

      const res =
        type === "Create"
          ? await createCategory(formattedValues)
          : await updateCategory({ ...formattedValues, _id: categoryId! });

      if (res.success) {
        toast.success(res.message);
        router.push("/admin/categories");
        router.refresh();
      } else {
        if (res.errors) {
          Object.entries(res.errors).forEach(([field, messages]) => {
            form.setError(field as keyof CategoryFormValues, {
              type: "server",
              message: messages.join(". "),
            });
          });
        }
        toast.error(res.message || "Failed to save category");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-5xl mx-auto"
      >
        {/* Core Info: Name & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Category Name</FieldLabel>
                
                  <Input aria-invalid={fieldState.invalid} {...field} placeholder="e.g. Nike Dunk Low" />
                
                <FieldDescription>
                  Used for display and organization.
                </FieldDescription>
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="slug"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Slug</FieldLabel>
                
                  <Input aria-invalid={fieldState.invalid} {...field} placeholder="nike-dunk-low" />
                
                <FieldDescription>
                  URL-friendly version of the category name.
                </FieldDescription>
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        {/* Hierarchy & Description */}
        <div className="">
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Description</FieldLabel>
                
                  <Textarea
                    aria-invalid={fieldState.invalid} {...field}
                    placeholder="Short description for admin use"
                  />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <MediaUploader
          form={form}
          name="image"
          label="Category Image"
          uploadRoute="categories"
        />
        {/* SEO Section */}
        <div className="space-y-6 border-t pt-6">
          <h3 className="text-lg font-semibold">SEO & Metadata</h3>

          <Controller
            control={form.control}
            name="seoTitle"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>SEO Title</FieldLabel>
                
                  <Input
                    aria-invalid={fieldState.invalid} {...field}
                    placeholder="Meta title for search engines"
                  />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="seoDescription"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>SEO Description</FieldLabel>
                
                  <Textarea
                    aria-invalid={fieldState.invalid} {...field}
                    placeholder="Brief summary for search results"
                  />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="seoKeywords"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>SEO Keywords</FieldLabel>
                
                  <Input
                    placeholder="sneakers, nike, dunk, low"
                    value={field.value?.join(", ") || ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value.split(",").map((k) => k.trim()),
                      )
                    }
                  />
                
                <FieldDescription>
                  Separate keywords with commas.
                </FieldDescription>
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <FormError message={form.formState.errors.root?.message} />

        <Controller
          control={form.control}
          name="isFeatured"
          render={({ field, fieldState }) => (
            <Field className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm" data-invalid={fieldState.invalid}>
              
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="rounded-md"
                />
              

              <div className="space-y-1 leading-none">
                <FieldLabel className="cursor-pointer">
                  Featured Category
                </FieldLabel>

                <FieldDescription>
                  This category will be displayed on the homepage cards.
                </FieldDescription>
              </div>
            </Field>
          )}
        />
        {/* Action Button */}
        <SubmitButton
          isLoading={form.formState.isSubmitting}
          className="w-full"
        >
          {type === "Create" ? "Create Category" : "Update Category"}
        </SubmitButton>
      </form>
    </FormProvider>
  );
}
