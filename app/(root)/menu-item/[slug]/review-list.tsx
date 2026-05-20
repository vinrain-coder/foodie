"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, CornerDownRight, StarIcon, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  SubmitHandler,
  UseFormReturn,
  useForm,
  Controller,
  FormProvider,
} from "react-hook-form";
import { useInView } from "react-intersection-observer";
import { z } from "zod";

import RatingSummary from "@/components/shared/menuItem/rating-summary";
import ReviewImageUploader from "@/components/shared/review-image-uploader";
import DeleteDialog from "@/components/shared/delete-dialog";
import { LoadingButton } from "@/components/shared/loading-button";

import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  deleteReview,
  getReviews,
  submitReviewAction,
} from "@/lib/actions/review.actions";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { toSignInPath } from "@/lib/redirects";
import { ReviewInputSchema } from "@/lib/validator";
import { IReviewDetails } from "@/types";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";

const ReviewFormSchema = ReviewInputSchema.omit({
  menuItem: true,
  user: true,
});

type CustomerReviewInput = z.input<typeof ReviewFormSchema>;
type CustomerReview = z.output<typeof ReviewFormSchema>;

const reviewFormDefaultValues: CustomerReviewInput = {
  title: "",
  comment: "",
  images: [],
  rating: 5,
  isVerifiedPurchase: false,
};

function ReviewFormFields({
  form,
}: {
  form: UseFormReturn<CustomerReviewInput, unknown, CustomerReview>;
}) {
  return (
    <div className="space-y-5 overflow-auto max-h-[60vh]">
      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Title</FieldLabel>

            <Input
              placeholder="Summarize your experience"
              aria-invalid={fieldState.invalid}
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
          <Field className="w-full" data-invalid={fieldState.invalid}>
            <FieldLabel>Rating</FieldLabel>
            <Select
              onValueChange={(val) => field.onChange(Number(val))}
              value={String(field.value ?? 5)}
            >
              <SelectTrigger
                className="w-full cursor-pointer"
                aria-invalid={fieldState.invalid}
              >
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>

              <SelectContent>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SelectItem
                    key={i}
                    value={(i + 1).toString()}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {i + 1}
                      <StarIcon className="size-4 fill-primary text-primary" />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="Share your experience with this menuItem..."
              className="min-h-16 resize-none"
              aria-invalid={fieldState.invalid}
              {...field}
            />

            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="images"
        render={({ field, fieldState }) => (
          <ReviewImageUploader value={field.value} onChange={field.onChange} />
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
    </div>
  );
}

export default function ReviewList({
  menuItem,
  userId,
}: {
  menuItem: IMenuItem;
  userId: string;
}) {
  const [reviews, setReviews] = useState<IReviewDetails[]>([]);
  const [page, setPage] = useState(2);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { ref, inView } = useInView({ triggerOnce: true });

  const form = useForm<CustomerReviewInput, unknown, CustomerReview>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: reviewFormDefaultValues,
  });

  const loadInitial = useCallback(async () => {
    setLoadingReviews(true);
    const res = await getReviews({
      menuItemId: menuItem._id.toString(),
      page: 1,
    });
    setReviews(res.data);
    setTotalPages(res.totalPages);
    setPage(2);
    setLoadingReviews(false);
  }, [menuItem._id]);

  useEffect(() => {
    if (inView) loadInitial();
  }, [inView, loadInitial]);

  const loadMore = async () => {
    if (loadingReviews || page > totalPages) return;
    setLoadingReviews(true);
    const res = await getReviews({
      menuItemId: menuItem._id.toString(),
      page,
    });
    setReviews((prev) => [...prev, ...res.data]);
    setPage((p) => p + 1);
    setLoadingReviews(false);
  };

  const onSubmit: SubmitHandler<CustomerReview> = async (values) => {
    setIsSubmitting(true);
    try {
      const res = await submitReviewAction(
        { ...values, menuItem: menuItem._id.toString() },
        `/menuu-item/${menuItem.slug}`,
      );

      if (!res.success) {
        if (res.errors) {
          Object.entries(res.errors).forEach(([field, messages]) => {
            form.setError(field as any, {
              type: "server",
              message: messages.join(". "),
            });
          });
        }
        toast.error(res.message || "Failed to submit review");
        return;
      }

      toast.success(res.message);
      form.reset(reviewFormDefaultValues);
      setDrawerOpen(false);
      setDialogOpen(false);
      loadInitial();
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewForm = (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ReviewFormFields form={form} />
      </form>
    </FormProvider>
  );

  return (
    <div className="space-y-6">
      {/* LEFT PANEL */}
      <div className="grid gap-8 lg:grid-cols-4">
        <div>
          <Card>
            <CardContent className="space-y-5 p-6">
              <RatingSummary
                avgRating={menuItem.avgRating}
                numReviews={menuItem.numReviews}
                ratingDistribution={menuItem.ratingDistribution}
              />

              <Separator />

              {userId ? (
                <>
                  {/* Mobile */}
                  <div className="md:hidden">
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                      <DrawerTrigger asChild>
                        <Button className="w-full rounded-full">
                          Write review
                        </Button>
                      </DrawerTrigger>

                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>Write review</DrawerTitle>
                        </DrawerHeader>

                        <div className="p-4 overflow-auto">{reviewForm}</div>
                      </DrawerContent>
                    </Drawer>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full rounded-full">
                          Write review
                        </Button>
                      </DialogTrigger>

                      <DialogContent>
                        <DialogTitle>Write review</DialogTitle>

                        <DialogDescription>
                          Share your experience with this menu item.
                        </DialogDescription>

                        {reviewForm}
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              ) : (
                <Link
                  href={toSignInPath(`/menu-item/${menuItem.slug}#reviews`)}
                >
                  <Button className="w-full rounded-full">
                    Sign in to review
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-3 space-y-5">
          {loadingReviews && reviews.length === 0 ? (
            <div className="py-10 text-sm text-muted-foreground">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews yet</p>
          ) : null}

          <div className="divide-y">
            {reviews.map((review) => {
              const reviewImages =
                review.images && review.images.length > 0
                  ? review.images
                  : review.image
                    ? [review.image]
                    : [];
              return (
                <div key={review._id} className="py-5 space-y-2">
                  {/* stars + title */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`size-4 ${
                          i < review.rating
                            ? "fill-primary text-primary"
                            : "text-muted"
                        }`}
                      />
                    ))}
                    {review.title && (
                      <h3 className="font-semibold">{review.title}</h3>
                    )}
                    {review.isVerifiedPurchase && (
                      <Badge variant="success">Verified</Badge>
                    )}
                  </div>

                  {/* author */}
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="size-4" />
                    {review.user?.name || "Anonymous"} •
                    <Calendar className="size-4 ml-2" />
                    {review.createdAt &&
                      new Intl.DateTimeFormat("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(review.createdAt))}
                  </p>

                  {/* comment */}
                  <p className="whitespace-pre-line">{review.comment}</p>

                  {/* image */}
                  {reviewImages.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {reviewImages.map((imageUrl, index) => (
                        <Image
                          key={`${review._id}-${index}`}
                          src={imageUrl}
                          alt="review"
                          width={140}
                          height={140}
                          className="rounded-lg border object-cover h-28 w-28 sm:h-32 sm:w-32"
                        />
                      ))}
                    </div>
                  )}

                  {/* admin reply */}
                  {!!review.adminReply?.message?.trim() && (
                    <div className="ml-8 mt-3 border-t pt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CornerDownRight className="size-4" />
                        Admin
                      </div>
                      <p className="text-sm">{review.adminReply.message}</p>
                    </div>
                  )}

                  {userId && review.user?._id === userId && (
                    <div className="pt-1">
                      <DeleteDialog
                        id={review._id}
                        action={deleteReview}
                        callbackAction={loadInitial}
                        title="Delete your review?"
                        description="This will permanently remove your review and images."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {page <= totalPages && (
            <Button onClick={loadMore} disabled={loadingReviews}>
              {loadingReviews ? "Loading..." : "Load more"}
            </Button>
          )}
        </div>
      </div>

      <div ref={ref} />
    </div>
  );
}
