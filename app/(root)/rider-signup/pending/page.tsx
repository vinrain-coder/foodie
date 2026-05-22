import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, ShieldCheck, User } from "lucide-react";
import {
  getRiderRegistrationStatus,
} from "@/lib/actions/rider-profile.actions";
import Breadcrumb from "@/components/shared/breadcrumb";
import { getServerSession } from "@/lib/get-session";
import { toSignInPath } from "@/lib/redirects";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { formatDateTime } from "@/lib/utils";
import { isRiderRole, isAdminRole } from "@/lib/dashboard-access";

export const metadata: Metadata = {
  title: "Rider Application Pending",
  description:
    "Track your rider KYC application while your registration is under review.",
  robots: PRIVATE_ROBOTS,
};

export default async function RiderPendingPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect(toSignInPath("/rider-signup/pending"));
  }

  const status = await getRiderRegistrationStatus();

  if (!status.exists) {
    redirect("/rider-signup");
  }

  if (status.status === "active") {
    redirect("/rider/jobs");
  }

  if (status.status === "suspended") {
    redirect("/rider-signup");
  }

  const submittedAt = formatDateTime(new Date()).dateTime;

  return (
    <div className="space-y-5 md:space-y-7 min-h-[calc(100vh-4rem)]">
      <Breadcrumb />

      <section className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-linear-to-br from-amber-50 via-background to-orange-100 px-5 py-8 md:px-10 md:py-12 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-900/20">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            <Clock3 className="h-3.5 w-3.5" />
            Review In Progress
          </div>

          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Your rider application is awaiting review
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Your KYC documents have been submitted and are currently under
            verification. This page updates as soon as the decision is made.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-amber-300/80 bg-background px-3 py-1 font-medium">
              Submitted: {submittedAt}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border/70 bg-background p-4 md:grid-cols-2 md:p-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">What happens next</h2>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>
              1. We validate your identity documents and vehicle registration
              details.
            </li>
            <li>
              2. We run fraud-prevention and background verification checks.
            </li>
            <li>
              3. You receive approval and instant access to your rider
              dashboard.
            </li>
          </ol>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Your submitted profile</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2 border-b pb-2">
              <dt className="text-muted-foreground">Full Name</dt>
              <dd className="font-medium">{status.fullName}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b pb-2">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{status.phone}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b pb-2">
              <dt className="text-muted-foreground">Vehicle</dt>
              <dd className="font-medium capitalize">
                {status.vehicleType || "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">License Number</dt>
              <dd className="font-medium">{status.licenseNumber || "-"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-300/60 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            KYC and fraud-prevention checks are active while your application is
            pending. Submitted details remain temporarily locked until the
            review completes.
          </p>
        </div>
      </section>

      {status.adminNote ? (
        <section className="rounded-2xl border border-amber-300/70 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <p>
            <strong>Admin note:</strong> {status.adminNote}
          </p>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2 pb-6">
        <Link
          href="/rider/profile"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <User className="h-4 w-4" />
          Go to Profile
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Back to Home
        </Link>
      </section>
    </div>
  );
}
