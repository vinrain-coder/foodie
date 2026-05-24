"use client";

import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FormProvider,
  useForm,
  Controller,
  type Resolver,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  createMenuItem,
  updateMenuItem,
} from "@/lib/actions/menu.item.actions";
import { Checkbox } from "@/components/ui/checkbox";
import { toSlug } from "@/lib/utils";
import { IMenuItemInput } from "@/types";
import { toast } from "sonner";
import SubmitButton from "@/components/shared/submit-button";
import { FormError } from "@/components/shared/form-error";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TagsInput from "./tag-input";
import { Textarea } from "@/components/ui/textarea";
import MediaUploader from "@/components/shared/media-uploader";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { MenuItemInputSchema, MenuItemUpdateSchema } from "@/lib/validator";

const MarkdownEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

const markdownEditorViewConfig = {
  menu: true,
  md: true,
  html: false,
  both: false,
  fullScreen: true,
  hideMenu: false,
} as const;

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault(); // Prevent form submission on Enter key press
  }
};

const capitalizeWords = (value: string) =>
  value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

const menuItemDefaultValues: IMenuItemInput =
  process.env.NODE_ENV === "development"
    ? {
        name: "Sample Menu Item",
        slug: "sample-menu-item",
        category: "Sample Category",
        images: ["/images/bags.jpg"],
        videoLink: "https://youtube.com",
        shortDescription: "This is a sample short description.",
        description: "This is a sample description of the menu item.",
        price: 99.99,
        countInStock: 15,
        numReviews: 0,
        avgRating: 0,
        numSales: 0,
        isPublished: true,
        tags: [],
        ratingDistribution: [],
        reviews: [],
      }
    : {
        name: "",
        slug: "",
        category: "",
        images: [],
        videoLink: "",
        shortDescription: "",
        description: "",
        price: 0,
        countInStock: 0,
        numReviews: 0,
        avgRating: 0,
        numSales: 0,
        isPublished: true,
        tags: [],
        ratingDistribution: [],
        reviews: [],
      };

const MenuItemForm = ({
  type,
  menuItem,
  menuItemId,
  categories,
  restaurants,
}: {
  type: "Create" | "Update";
  menuItem?: IMenuItem;
  menuItemId?: string;
  categories: { _id: string; name: string }[];
  restaurants: { _id: string; name: string }[];
}) => {
  const { theme } = useTheme();
  const router = useRouter();

  const form = useForm<IMenuItemInput>({
    resolver:
      type === "Update"
        ? (zodResolver(
            MenuItemUpdateSchema,
          ) as unknown as Resolver<IMenuItemInput>)
        : (zodResolver(
            MenuItemInputSchema,
          ) as unknown as Resolver<IMenuItemInput>),
    defaultValues:
      menuItem && type === "Update"
        ? {
            ...menuItem,
            restaurant: menuItem.restaurant
              ? String(menuItem.restaurant)
              : undefined,
          }
        : menuItemDefaultValues,
  });

  async function onSubmit(values: IMenuItemInput) {
    let res;
    if (type === "Create") {
      res = await createMenuItem(values);
    } else {
      if (!menuItemId) {
        router.push(`/restaurant-admin/menu-items`);
        return;
      }
      res = await updateMenuItem({ ...values, _id: menuItemId });
    }

    if (!res.success) {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as keyof IMenuItemInput, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || `Failed to ${type.toLowerCase()} menuItem`);
    } else {
      toast.success(res.message);
      router.push(`/restaurant-admin/menu-items`);
    }
  }

  const nameValue = form.watch("name");

  // Update slug whenever name changes
  useEffect(() => {
    const nextSlug = toSlug(nameValue || "");
    const currentSlug = form.getValues("slug") || "";
    if (currentSlug === nextSlug) return;
    form.setValue("slug", nextSlug);
  }, [nameValue, form]);

  return (
    <FormProvider {...form}>
      <form
        method="post"
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={handleKeyDown}
        className="space-y-8"
      >
        <div className="flex flex-col gap-5 md:flex-row">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Name</FieldLabel>

                <Input
                  placeholder="Enter menu item name"
                  aria-invalid={fieldState.invalid}
                  {...field}
                  onChange={(e) =>
                    field.onChange(capitalizeWords(e.target.value))
                  }
                />

                <FieldDescription>
                  Used for display and organization.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="slug"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Slug</FieldLabel>

                <Input
                  placeholder="Enter menu item slug"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />

                <FieldDescription>
                  URL-friendly version of the menu item name.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <div className="flex flex-col gap-5 md:flex-row">
          <Controller
            control={form.control}
            name="restaurant"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Restaurant</FieldLabel>

                <Select
                  value={field.value || ""}
                  onValueChange={(value) => field.onChange(value || undefined)}
                >
                  <SelectTrigger
                    className="w-full cursor-pointer"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select restaurant" />
                  </SelectTrigger>

                  <SelectContent>
                    {restaurants.map((restaurant) => (
                      <SelectItem key={restaurant._id} value={restaurant._id}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="category"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Category</FieldLabel>

                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className="w-full cursor-pointer"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <div className="flex flex-col gap-5 md:flex-row">
          <Controller
            control={form.control}
            name="videoLink"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Video Link (optional)</FieldLabel>

                <Input
                  placeholder="https://youtube.com/xyz"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <div className="flex flex-col gap-5 md:flex-row">
          <Controller
            control={form.control}
            name="price"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Net Price</FieldLabel>

                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  onKeyDown={(e) => {
                    if (e.key === "-") {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Enter menu price price"
                  {...field}
                />

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="countInStock"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Count In Stock</FieldLabel>

                <Input
                  type="number"
                  min={0}
                  step="1"
                  onKeyDown={(e) => {
                    if (e.key === "-") {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Enter menu item count in stock"
                  {...field}
                />

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        {/* Tags Input */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <Controller
            control={form.control}
            name="tags"
            render={({ field, fieldState }) => (
              <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-muted pb-4 md:pb-0 md:pr-4">
                <TagsInput field={field} error={fieldState.error} />
              </div>
            )}
          />
        </div>

        <MediaUploader
          form={form}
          label="Menu Item Image"
          name="images"
          uploadRoute="menuItems"
          multiple
          maxFiles={5}
        />

        <Controller
          control={form.control}
          name="shortDescription"
          render={({ field, fieldState }) => (
            <Field className="w-full" data-invalid={fieldState.invalid}>
              <FieldLabel>Short Description</FieldLabel>

              <Textarea
                placeholder="Enter short menu item description"
                aria-invalid={fieldState.invalid}
                {...field}
              />

              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div>
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Description</FieldLabel>

                <div className="w-full overflow-x-scroll">
                  <MarkdownEditor
                    {...field}
                    style={{ height: "500px" }}
                    canView={markdownEditorViewConfig}
                    theme={theme === "dark" ? "dark" : "light"}
                    onChange={({ text }) => {
                      if ((form.getValues("description") || "") === text) return;
                      form.setValue("description", text);
                    }}
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
                </div>

                <FieldDescription>
                  You can <span>@mention</span> other users and organizations to
                  link to them.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <div>
          <Controller
            control={form.control}
            name="isPublished"
            render={({ field, fieldState }) => (
              <Field
                className="flex items-center space-x-2 cursor-pointer"
                data-invalid={fieldState.invalid}
              >
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
        <FormError message={form.formState.errors.root?.message} />

        <div>
          <SubmitButton
            type="submit"
            isLoading={form.formState.isSubmitting}
            className="button col-span-2 w-full cursor-pointer"
            loadingText="Submitting..."
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {type} Menu Item
          </SubmitButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default MenuItemForm;

