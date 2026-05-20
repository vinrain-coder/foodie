import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3, ShieldCheck, Store } from "lucide-react";

import Breadcrumb from "@/components/shared/breadcrumb";
import { connectToDatabase } from "@/lib/db";
import Restaurant from "@/lib/db/models/restaurant.model";
import { getServerSession } from "@/lib/get-session";
import { toSignInPath } from "@/lib/redirects";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Restaurant Application Pending",
  description:
    "Track your restaurant onboarding status while your application is under review.",
  robots: PRIVATE_ROBOTS,
};

export default async function RestaurantPendingPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(toSignInPath("/restaurant/pending"));
  }

  await connectToDatabase();

  const application = await Restaurant.findOne({ ownerId: session.user.id })
    .select(
      "name slug status isApproved isActive adminNote createdAt updatedAt location phone whatsapp email",
    )
    .lean();

  if (!application) {
    redirect("/restaurant/register");
  }

  if (application.status === "approved" && application.isApproved) {
    redirect("/restaurant-admin");
  }

  if (application.status !== "pending") {
    redirect("/restaurant/register");
  }

  const submittedAt = formatDateTime(application.createdAt).dateTime;
  const updatedAt = formatDateTime(application.updatedAt).dateTime;

  return (
    <div className="space-y-5 md:space-y-7">
      <Breadcrumb />

      <section className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-linear-to-br from-amber-50 via-background to-orange-100 px-5 py-8 md:px-10 md:py-12 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-900/20">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            <Clock3 className="h-3.5 w-3.5" />
            Review In Progress
          </div>

          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {application.name} is waiting for approval
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Your restaurant application has been received and is currently under
            manual review. This page is private to your account and updates as
            soon as the decision is made.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-amber-300/80 bg-background px-3 py-1 font-medium">
              Submitted: {submittedAt}
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1 font-medium text-muted-foreground">
              Last update: {updatedAt}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border/70 bg-background p-4 md:grid-cols-2 md:p-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">What happens next</h2>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. We validate your business details and contact channels.</li>
            <li>2. We confirm your restaurant profile meets marketplace standards.</li>
            <li>3. You receive approval and instant access to your dashboard.</li>
          </ol>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Your submitted profile</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2 border-b pb-2">
              <dt className="text-muted-foreground">Restaurant</dt>
              <dd className="font-medium">{application.name}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b pb-2">
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="font-medium">/{application.slug}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b pb-2">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium">{application.location}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Primary phone</dt>
              <dd className="font-medium">{application.phone}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-300/60 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Fraud prevention checks are active while your application is pending.
            To protect customers, submitted details are temporarily locked until
            review completes.
          </p>
        </div>
      </section>

      {application.adminNote ? (
        <section className="rounded-2xl border border-amber-300/70 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <p>
            <strong>Admin note:</strong> {application.adminNote}
          </p>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2 pb-6">
        <Link
          href="/restaurant"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Store className="h-4 w-4" />
          Back to Restaurant Hub
        </Link>
        <Link
          href="/support"
          className="inline-flex items-center gap-2 rounded-full border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Contact Support
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
