"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { z } from "zod";
import MarkdownEditor from "react-markdown-editor-lite";
import ReactMarkdown from "react-markdown";
import "react-markdown-editor-lite/lib/index.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createBlog, updateBlog } from "@/lib/actions/blog.actions";
import { BlogInputSchema, BlogUpdateSchema } from "@/lib/validator";
import { toast } from "sonner";
import { toSlug } from "@/lib/utils";
import { X } from "lucide-react";
import SubmitButton from "@/components/shared/submit-button";
import { FormError } from "@/components/shared/form-error";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import MediaUploader from "@/components/shared/media-uploader";

// Set default values correctly based on the BlogInputSchema
const blogDefaultValues = {
  title: "",
  slug: "",
  image: "",
  content: "",
  category: "",
  views: 0,
  tags: [],
  isPublished: false,
  publishedAt: undefined,
};

type BlogFormValues = z.infer<typeof BlogInputSchema>;

const BlogForm = ({
  type,
  blog,
  blogId,
}: {
  type: "Create" | "Update";
  blog?: BlogFormValues;
  blogId?: string;
}) => {
  const { theme } = useTheme();
  const router = useRouter();

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(
      type === "Update" ? BlogUpdateSchema : BlogInputSchema,
    ),
    defaultValues: blog && type === "Update" ? blog : blogDefaultValues,
  });

  async function onSubmit(values: BlogFormValues) {
    let res;
    if (type === "Create") {
      res = await createBlog(values);
    } else {
      if (!blogId) {
        router.push(`/admin/blogs`);
        return;
      }
      res = await updateBlog({ ...values, _id: blogId });
    }

    if (res.success) {
      toast.success(res.message);
      router.push(`/admin/blogs`);
    } else {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as keyof BlogFormValues, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || `Failed to ${type.toLowerCase()} blog`);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Title and Slug */}
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

        {/* Category */}
        <Controller
          control={form.control}
          name="category"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Category</FieldLabel>
              
                <Input placeholder="Enter category" aria-invalid={fieldState.invalid} {...field} />
              
              <FieldError  errors={[fieldState.error]} />
            </Field>
          )}
        />

        {/* Tags Input */}
        <Controller
          control={form.control}
          name="tags"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Tags</FieldLabel>
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {(field.value || []).map((tag, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg p-2"
                    >
                      <Input
                        autoFocus={index === (field.value || []).length - 1}
                        className="w-full bg-transparent focus:outline-none focus:ring-2 rounded-lg"
                        value={tag}
                        onChange={(e) => {
                          const updatedTags = [...(field.value || [])];
                          updatedTags[index] = e.target.value;
                          field.onChange(updatedTags);
                        }}
                        placeholder="Enter a tag"
                        onKeyDown={(e) =>
                          e.key === "Enter" && e.preventDefault()
                        }
                      />
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          const updatedTags = (field.value || []).filter(
                            (_, i) => i !== index,
                          );
                          field.onChange(updatedTags);
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const updatedTags = [...(field.value || []), ""];
                    field.onChange(updatedTags);
                  }}
                  className="mt-2 w-full"
                >
                  Add Tag
                </Button>
              </div>
            </Field>
          )}
        />

        <div className="bg-slate-50 p-4 rounded-lg border border-dashed">
          <MediaUploader
            form={form}
            label="Blog image"
            name="image"
            uploadRoute="blogs"
          />
        </div>

        {/* Content */}
        <Controller
          control={form.control}
          name="content"
          render={({ field, fieldState }) => (
            <Field className="w-full" data-invalid={fieldState.invalid}>
              <FieldLabel>Content</FieldLabel>
              
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
              
              <FieldError  errors={[fieldState.error]} />
            </Field>
          )}
        />

        {/* Is Published */}
        <Controller
          control={form.control}
          name="isPublished"
          render={({ field, fieldState }) => (
            <Field className="flex items-center gap-2" data-invalid={fieldState.invalid}>
              
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              
              <FieldLabel>Is Published?</FieldLabel>
            </Field>
          )}
        />

        <FormError message={form.formState.errors.root?.message} />

        {/* Submit Button */}
        <SubmitButton
          isLoading={form.formState.isSubmitting}
          loadingText="Submitting..."
          size="lg"
        >
          {type} Blog
        </SubmitButton>
      </form>
    </FormProvider>
  );
};

export default BlogForm;
