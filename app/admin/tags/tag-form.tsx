"use client";

import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Input } from "@/components/ui/input";
import SubmitButton from "@/components/shared/submit-button";
import { FormError } from "@/components/shared/form-error";

import { TagInputSchema } from "@/lib/validator";
import { toSlug } from "@/lib/utils";
import { createTag, updateTagAction } from "@/lib/actions/tag.actions";
import MediaUploader from "@/components/shared/media-uploader";
import { Textarea } from "@/components/ui/textarea";

/* ---------------- Types ---------------- */
type TagFormValues = z.infer<typeof TagInputSchema>;

interface TagFormProps {
  type: "Create" | "Update";
  tag?: Partial<TagFormValues>;
  tagId?: string;
}

/* ---------------- Component ---------------- */
export default function TagForm({ type, tag, tagId }: TagFormProps) {
  const router = useRouter();

  const form = useForm<TagFormValues>({
    resolver: zodResolver(TagInputSchema),
    defaultValues: {
      name: tag?.name ?? "",
      slug: tag?.slug ?? "",
      image: tag?.image || "",
      description: tag?.description ?? "",
    },
  });

  const nameValue = form.watch("name");

  /* -------- Auto-generate slug -------- */
  useEffect(() => {
    if (type === "Create" && nameValue) {
      form.setValue("slug", toSlug(nameValue), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [nameValue, form, type]);

  /* ---------------- Submit ---------------- */
  const onSubmit = async (values: TagFormValues) => {
    try {
      const res =
        type === "Create"
          ? await createTag(values)
          : await updateTagAction({
              ...values,
              _id: tagId!,
            });

      if (res.success) {
        toast.success(res.message);
        router.push("/admin/tags");
        router.refresh();
      } else {
        if (res.errors) {
          Object.entries(res.errors).forEach(([field, messages]) => {
            form.setError(field as keyof TagFormValues, {
              type: "server",
              message: messages.join(". "),
            });
          });
        }
        toast.error(res.message || "Failed to save tag");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
        {/* Core Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Tag Name</FieldLabel>
                
                  <Input aria-invalid={fieldState.invalid} {...field} placeholder="e.g. Running" />
                
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
                
                  <Input aria-invalid={fieldState.invalid} {...field} placeholder="running" />
                
                <FieldDescription>
                  URL-friendly version of the tag name.
                </FieldDescription>
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        {/* Media */}
        <MediaUploader
          form={form}
          name="image"
          label="Tag Image"
          uploadRoute="tags"
        />

        {/* Description */}
        <div className="">
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Description</FieldLabel>
                
                  <Textarea aria-invalid={fieldState.invalid} {...field} placeholder="Short tag description" />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <FormError message={form.formState.errors.root?.message} />

        {/* Submit */}
        <div className="flex justify-end">
          <SubmitButton isLoading={form.formState.isSubmitting}>
            {type === "Create" ? "Create Tag" : "Update Tag"}
          </SubmitButton>
        </div>
      </form>
    </FormProvider>
  );
}
