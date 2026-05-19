"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, Controller, FormProvider, type Resolver } from "react-hook-form";

import { z } from "zod";

import MarkdownEditor from "react-markdown-editor-lite";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWebPage, updateWebPage } from "@/lib/actions/web-page.actions";
import { WebPageInputSchema, WebPageUpdateSchema } from "@/lib/validator";
import { Checkbox } from "@/components/ui/checkbox";
import { toSlug } from "@/lib/utils";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import MediaUploader from "@/components/shared/media-uploader";
import { Textarea } from "@/components/ui/textarea";

const webPageDefaultValues =
  process.env.NODE_ENV === "development"
    ? {
        title: "Sample Page",
        slug: "sample-page",
        excerpt: "Sample Excerpt",
        image: "Sample Image",
        content: "Sample Content",
      }
    : {
        title: "",
        slug: "",
        image: "",
        excerpt: "",
        content: "",
      };

type WebPageFormValues = z.infer<typeof WebPageInputSchema>;

const WebPageForm = ({
  type,
  webPage,
  webPageId,
}: {
  type: "Create" | "Update";
  webPage?: WebPageFormValues;
  webPageId?: string;
}) => {
  const { theme } = useTheme();
  const router = useRouter();

  const form = useForm<WebPageFormValues>({
    resolver:
      type === "Update"
        ? (zodResolver(WebPageUpdateSchema) as unknown as Resolver<WebPageFormValues>)
        : (zodResolver(WebPageInputSchema) as unknown as Resolver<WebPageFormValues>),
    defaultValues:
      webPage && type === "Update" ? webPage : webPageDefaultValues,
  });

  async function onSubmit(values: WebPageFormValues) {
    let res;
    if (type === "Create") {
      res = await createWebPage(values);
    } else {
      if (!webPageId) {
        router.push(`/admin/web-pages`);
        return;
      }
      res = await updateWebPage({ ...values, _id: webPageId });
    }

    if (!res.success) {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as keyof WebPageFormValues, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || `Failed to ${type.toLowerCase()} page`);
    } else {
      toast.success(res.message);
      router.push(`/admin/web-pages`);
    }
  }

  const nameValue = form.watch("title");

  const capitalizeWords = (value: string) =>
    value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  useEffect(() => {
    form.setValue("slug", toSlug(nameValue));
  }, [nameValue, form]);

  return (
    <FormProvider {...form}>
      <form
        method="post"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <div className="flex flex-col gap-5 md:flex-row">
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Title</FieldLabel>
                
                  <Input
                    placeholder="Enter title"
                    aria-invalid={fieldState.invalid} {...field}
                    onChange={(e) =>
                      field.onChange(capitalizeWords(e.target.value))
                    }
                  />
                

                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="slug"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Slug</FieldLabel>

                
                  <div className="relative">
                    <Input
                      placeholder="Enter slug"
                      className="pl-8"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  </div>
                

                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            control={form.control}
            name="excerpt"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>WebPage Excerpt</FieldLabel>
                
                  <Textarea
                    aria-invalid={fieldState.invalid} {...field}
                    placeholder="Short WebPage description"
                  />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        {/*Media */}
        <div className="bg-slate-50 p-4 rounded-lg border border-dashed">
          <MediaUploader
            form={form}
            name="image"
            label="WebPage Image"
            uploadRoute="pages"
          />
        </div>
        <div className="flex flex-col gap-5 md:flex-row">
          <Controller
            control={form.control}
            name="content"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Content</FieldLabel>
                <>
                  
                    <MarkdownEditor
                      {...field}
                      style={{ height: "500px" }}
                      theme={theme === "dark" ? "dark" : "light"}
                      onChange={({ text }) => form.setValue("content", text)}
                      renderHTML={(text) => (
                        <div
                          className={`prose max-w-none ${
                            theme === "dark" ? "prose-invert" : ""
                          }`}
                        >
                          <ReactMarkdown>{text}</ReactMarkdown>
                        </div>
                      )}
                    />
                  
                </>
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <div>
          <Controller
            control={form.control}
            name="isPublished"
            render={({ field, fieldState }) => (
              <Field className="space-x-1 items-center flex flex-row" data-invalid={fieldState.invalid}>
                
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                
                <FieldLabel>Is Published?</FieldLabel>
              </Field>
            )}
          />
        </div>
        <FormError message={form.formState.errors.root?.message} />

        <div>
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
            className="button col-span-2 w-full"
          >
            {form.formState.isSubmitting ? "Submitting..." : `${type} Page `}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export default WebPageForm;
