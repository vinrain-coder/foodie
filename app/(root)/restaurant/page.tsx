import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Store, UtensilsCrossed } from "lucide-react";
import { getSetting } from "@/lib/actions/setting.actions";
import Breadcrumb from "@/components/shared/breadcrumb";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSetting();

  return {
    title: "Restaurant Hub",
    description:
      "Open your restaurant storefront, submit your application, and manage orders and menu items from one place.",
    alternates: {
      canonical: `${site.url}/restaurant`,
    },
    openGraph: {
      title: "Restaurant Hub",
      description:
        "Launch and manage your restaurant storefront with streamlined onboarding and operations tools.",
      url: `${site.url}/restaurant`,
      siteName: site.name,
      type: "website",
    },
  };
}

const highlights = [
  "Create and update your restaurant profile",
  "Publish and organize menu items faster",
  "Track orders and manage fulfillment status",
  "Keep settings, delivery options, and support in one dashboard",
];

const steps = [
  {
    label: "Step 1",
    title: "Submit your restaurant application",
    description:
      "Share your business details, operating info, and branding assets to start onboarding.",
    href: "/restaurant/register",
    cta: "Start Application",
  },
  {
    label: "Step 2",
    title: "Get approved by admin review",
    description:
      "Our team verifies your profile to ensure quality and readiness for marketplace visibility.",
    href: "/admin/restaurants",
    cta: "How Review Works",
  },
  {
    label: "Step 3",
    title: "Manage daily operations",
    description:
      "Handle menu updates, orders, analytics, and settings from your restaurant dashboard.",
    href: "/restaurant-admin",
    cta: "Open Dashboard",
  },
];

export default function RestaurantHubPage() {
  return (
    <div className="space-y-5 md:space-y-7">
      <Breadcrumb />

      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-orange-50 via-background to-amber-100 px-5 py-10 md:px-10 md:py-14 dark:from-orange-950/20 dark:to-amber-900/20">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
            <Store className="h-3.5 w-3.5" />
            Restaurant Hub
          </div>

          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Build and Run Your Restaurant Presence
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Use this hub to register your restaurant, monitor approval progress,
            and operate your storefront with practical tools built for daily food
            business workflows.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/restaurant/register"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 rounded-full border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Browse Live Restaurants
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-background px-4 py-5 md:px-6 md:py-6">
        <h2 className="text-lg font-semibold tracking-tight md:text-xl">
          What You Can Do Here
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/60 px-4 py-5 md:px-6 md:py-6">
        <div className="mb-4 flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">
            Onboarding Flow
          </h2>
        </div>

        <ol className="divide-y divide-border/70">
          {steps.map((step) => (
            <li key={step.title} className="py-4 first:pt-0 last:pb-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                {step.label}
              </p>
              <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
              <Link
                href={step.href}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {step.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

