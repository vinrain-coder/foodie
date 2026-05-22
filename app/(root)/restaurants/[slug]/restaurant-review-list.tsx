"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, StarIcon, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import DeleteDialog from "@/components/shared/delete-dialog";
import { LoadingButton } from "@/components/shared/loading-button";
import RatingSummary from "@/components/shared/menuItem/rating-summary";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteRestaurantReview,
  getRestaurantReviews,
  submitRestaurantReviewAction,
} from "@/lib/actions/restaurant-review.actions";
import { toSignInPath } from "@/lib/redirects";
import { RestaurantReviewInputSchema } from "@/lib/validator";
import { IRestaurantReviewDetails } from "@/types";
import { toast } from "sonner";

const RestaurantReviewFormSchema = RestaurantReviewInputSchema.omit({
  restaurant: true,
  user: true,
});

type RestaurantReviewFormInput = z.input<typeof RestaurantReviewFormSchema>;
type RestaurantReviewFormData = z.output<typeof RestaurantReviewFormSchema>;

const reviewFormDefaultValues: RestaurantReviewFormInput = {
  title: "",
  comment: "",
  rating: 5,
};

type RestaurantReviewSummary = {
  _id: string;
  slug: string;
  avgRating: number;
  numReviews: number;
  ratingDistribution: { rating: number; count: number }[];
};

export default function RestaurantReviewList({
  restaurant,
  userId,
}: {
  restaurant: RestaurantReviewSummary;
  userId: string;
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState<IRestaurantReviewDetails[]>([]);
  const [summary, setSummary] = useState({
    avgRating: restaurant.avgRating,
    numReviews: restaurant.numReviews,
    ratingDistribution: restaurant.ratingDistribution,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(2);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const form = useForm<RestaurantReviewFormInput, unknown, RestaurantReviewFormData>(
    {
      resolver: zodResolver(RestaurantReviewFormSchema),
      defaultValues: reviewFormDefaultValues,
    },
  );

  const loadInitial = async () => {
    setLoadingReviews(true);
    const res = await getRestaurantReviews({
      restaurantId: restaurant._id,
      page: 1,
    });
    setReviews(res.data);
    setSummary(res.summary);
    setTotalPages(res.totalPages);
    setPage(2);
    setLoadingReviews(false);
  };

  useEffect(() => {
    loadInitial();
  }, [restaurant._id]);

  const onSubmit: SubmitHandler<RestaurantReviewFormData> = async (values) => {
    const response = await submitRestaurantReviewAction(
      { ...values, restaurant: restaurant._id },
      `/restaurants/${restaurant.slug}`,
    );

    if (!response.success) {
      if (response.errors) {
        Object.entries(response.errors).forEach(([field, messages]) => {
          form.setError(field as any, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(response.message || "Failed to submit review");
      return;
    }

    toast.success(response.message || "Review saved");
    form.reset(reviewFormDefaultValues);
    await loadInitial();
    setDrawerOpen(false);
    setDialogOpen(false);
    router.refresh();
  };

  const loadMore = async () => {
    if (loadingReviews || page > totalPages) return;
    setLoadingReviews(true);
    const res = await getRestaurantReviews({
      restaurantId: restaurant._id,
      page,
    });
    setReviews((prev) => [...prev, ...res.data]);
    setPage((currentPage) => currentPage + 1);
    setLoadingReviews(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      <div>
        <Card>
          <CardContent className="space-y-5 p-6">
            <RatingSummary
              avgRating={summary.avgRating}
              numReviews={summary.numReviews}
              ratingDistribution={summary.ratingDistribution}
            />

            <Separator />

            {userId ? (
              <>
                <div className="md:hidden">
                  <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <DrawerTrigger asChild>
                      <Button className="w-full rounded-full">Write review</Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>Write review</DrawerTitle>
                      </DrawerHeader>
                      <div className="max-h-[70vh] overflow-auto p-4">
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-4"
                        >
                          <Controller
                            control={form.control}
                            name="title"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Title</FieldLabel>
                                <Input
                                  placeholder="Summarize your experience"
                                  {...field}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />

                          <Controller
                            control={form.control}
                            name="rating"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Rating</FieldLabel>
                                <Select
                                  onValueChange={(value) =>
                                    field.onChange(Number(value))
                                  }
                                  value={String(field.value ?? 5)}
                                >
                                  <SelectTrigger className="cursor-pointer">
                                    <SelectValue placeholder="Select rating" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                      <SelectItem
                                        key={index}
                                        value={String(index + 1)}
                                        className="cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          {index + 1}
                                          <StarIcon className="size-4 fill-primary text-primary" />
                                        </div>
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
                            name="comment"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Comment</FieldLabel>
                                <Textarea
                                  placeholder="Share your experience with this restaurant..."
                                  className="min-h-16 resize-none"
                                  {...field}
                                />
                                <FieldError errors={[fieldState.error]} />
                              </Field>
                            )}
                          />

                          <FormError
                            message={form.formState.errors.root?.message}
                          />

                          <LoadingButton
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            loading={form.formState.isSubmitting}
                            className="w-full"
                          >
                            Submit Review
                          </LoadingButton>
                        </form>
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>

                <div className="hidden md:block">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full rounded-full">Write review</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogTitle>Write review</DialogTitle>
                      <DialogDescription>
                        Share your experience with this restaurant.
                      </DialogDescription>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Controller
                          control={form.control}
                          name="title"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Title</FieldLabel>
                              <Input
                                placeholder="Summarize your experience"
                                {...field}
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="rating"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Rating</FieldLabel>
                              <Select
                                onValueChange={(value) =>
                                  field.onChange(Number(value))
                                }
                                value={String(field.value ?? 5)}
                              >
                                <SelectTrigger className="cursor-pointer">
                                  <SelectValue placeholder="Select rating" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <SelectItem
                                      key={index}
                                      value={String(index + 1)}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2">
                                        {index + 1}
                                        <StarIcon className="size-4 fill-primary text-primary" />
                                      </div>
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
                          name="comment"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Comment</FieldLabel>
                              <Textarea
                                placeholder="Share your experience with this restaurant..."
                                className="min-h-16 resize-none"
                                {...field}
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <FormError message={form.formState.errors.root?.message} />

                        <LoadingButton
                          type="submit"
                          disabled={form.formState.isSubmitting}
                          loading={form.formState.isSubmitting}
                          className="w-full"
                        >
                          Submit Review
                        </LoadingButton>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            ) : (
              <Link href={toSignInPath(`/restaurants/${restaurant.slug}#reviews`)}>
                <Button className="w-full rounded-full">Sign in to review</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5 lg:col-span-3">
        {loadingReviews && reviews.length === 0 ? (
          <div className="py-10 text-sm text-muted-foreground">
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet</p>
        ) : null}

        <div className="divide-y">
          {reviews.map((review) => (
            <div key={review._id} className="space-y-2 py-5">
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <StarIcon
                    key={index}
                    className={`size-4 ${
                      index < review.rating
                        ? "fill-primary text-primary"
                        : "text-muted"
                    }`}
                  />
                ))}
                {review.title ? <h3 className="font-semibold">{review.title}</h3> : null}
              </div>

              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="size-4" />
                {review.user?.name || "Anonymous"} |
                <Calendar className="ml-2 size-4" />
                {review.createdAt
                  ? new Intl.DateTimeFormat("en-KE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(review.createdAt))
                  : ""}
              </p>

              <p className="whitespace-pre-line">{review.comment}</p>

              {userId && review.user?._id === userId ? (
                <div className="pt-1">
                  <DeleteDialog
                    id={review._id}
                    action={deleteRestaurantReview}
                    callbackAction={loadInitial}
                    title="Delete your review?"
                    description="This will permanently remove your restaurant review."
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {page <= totalPages ? (
          <Button onClick={loadMore} disabled={loadingReviews}>
            {loadingReviews ? "Loading..." : "Load more"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
