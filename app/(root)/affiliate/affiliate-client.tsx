"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Users,
  BarChart3,
  Wallet,
  UserPlus,
  BadgeCheck,
  Share2,
  DollarSign,
  Award,
  Ticket,
  ArrowRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AffiliateClientProps {
  commissionRate: number;
  minimumPayout: number;
  affiliateStatus: {
    exists: boolean;
    status?: string;
    adminNote?: string;
  };
  user?: {
    id?: string;
    _id?: string;
    role?: string;
  } | null;
}

export default function AffiliateClientLayout({
  commissionRate,
  minimumPayout,
  affiliateStatus,
  user,
}: AffiliateClientProps) {
  const stats = {
    commissionRate,
    minimumPayout,
    activeAffiliates: "500+",
    totalPaid: "KSH 2M+",
  };

  const features = [
    {
      title: "Generous Commissions",
      description: `Earn up to ${commissionRate}% commission on every successful referral purchase.`,
      icon: Wallet,
      gradient:
        "from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Exclusive Discounts",
      description:
        "Offer your audience exclusive discount rates that improve conversions.",
      icon: Users,
      gradient:
        "from-blue-500/15 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Real-time Tracking",
      description:
        "Monitor earnings, clicks, and referrals from your affiliate dashboard.",
      icon: BarChart3,
      gradient:
        "from-emerald-500/15 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Quality Products",
      description:
        "Promote authentic premium footwear from trusted global brands.",
      icon: CheckCircle,
      gradient:
        "from-purple-500/15 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/10",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  const steps = [
    {
      title: "Sign Up",
      desc: "Create an account and apply for the affiliate program.",
      icon: UserPlus,
      action: user
        ? "/affiliate/register"
        : "/sign-in?redirect=/affiliate/register",
      actionLabel: user ? "Apply Now" : "Create Account",
    },
    {
      title: "Get Approved",
      desc: "Our team reviews your application within 24-48 hours.",
      icon: BadgeCheck,
      action: "/affiliate/register",
      actionLabel: "Learn More",
    },
    {
      title: "Share Products",
      desc: "Promote products using your unique referral link.",
      icon: Share2,
      action: "/search",
      actionLabel: "Browse Products",
    },
    {
      title: "Earn Commission",
      desc: "Get paid for every successful referral purchase.",
      icon: DollarSign,
      action: affiliateStatus.exists
        ? "/affiliate/dashboard"
        : "/affiliate/register",
      actionLabel: affiliateStatus.exists ? "View Earnings" : "Join Program",
    },
  ];

  const testimonials = [
    {
      quote:
        "I've been able to earn a steady side income by sharing my favorite shoes with my followers. Tracking is transparent and payouts are always reliable.",
      name: "Alex M.",
      title: "Content Creator",
      earnings: "KSH 150K+ earned",
    },
    {
      quote:
        "The commission rates are generous and the products are genuinely easy to recommend. My audience loves the discounts.",
      name: "Sarah K.",
      title: "Fashion Blogger",
      earnings: "KSH 85K+ earned",
    },
    {
      quote:
        "The dashboard makes it simple to monitor performance and referrals. I've referred hundreds of customers successfully.",
      name: "James O.",
      title: "Social Media Manager",
      earnings: "KSH 220K+ earned",
    },
  ];

  const isApproved =
    affiliateStatus.exists && affiliateStatus.status === "approved";

  const isPending =
    affiliateStatus.exists && affiliateStatus.status === "pending";

  const isRejected =
    affiliateStatus.exists && affiliateStatus.status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        {/* IMPORTANT FIX */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_40%)]" />

        <div className="pointer-events-none absolute inset-0 bg-grid-white/[0.02]" />

        <div className="container relative z-10 mx-auto px-4 py-14 md:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Badge className="mb-6 rounded-full border-0 bg-amber-500/10 px-4 py-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Ticket className="mr-2 h-4 w-4" />
              Trusted by creators and affiliates across Kenya
            </Badge>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">Earn While You Share</span>

              <span className="block bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                Join Our Affiliate Program
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Join Kenya&apos;s premier footwear affiliate program and earn
              commissions by referring customers to premium footwear products
              your audience will genuinely love.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {!user ? (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-xl px-8 text-base font-semibold shadow-lg shadow-amber-500/20"
                  >
                    <Link
                      href="/sign-in?redirect=/affiliate"
                      className="flex items-center gap-2"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-xl border-border/60 bg-background/70 px-8 text-base backdrop-blur"
                  >
                    <Link href="/affiliate/register">Learn More</Link>
                  </Button>
                </>
              ) : isApproved ? (
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl px-8 text-base font-semibold"
                >
                  <Link
                    href="/affiliate/dashboard"
                    className="flex items-center gap-2"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : isRejected ? (
                <div className="space-y-4">
                  <p className="text-sm text-destructive">
                    Application rejected: {affiliateStatus.adminNote}
                  </p>

                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/affiliate/register">Resubmit Application</Link>
                  </Button>
                </div>
              ) : isPending ? (
                <div className="rounded-2xl border bg-card/70 px-6 py-4 backdrop-blur">
                  <p className="text-base text-muted-foreground">
                    We are currently reviewing your application.
                  </p>
                </div>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl px-8 text-base font-semibold shadow-lg shadow-amber-500/20"
                >
                  <Link
                    href="/affiliate/register"
                    className="flex items-center gap-2"
                  >
                    Become an Affiliate
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                {stats.commissionRate}%
              </div>

              <div className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Commission Rate
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.minimumPayout}
              </div>

              <div className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Min. Payout
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-black">
                {stats.activeAffiliates}
              </div>

              <div className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active Affiliates
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                {stats.totalPaid}
              </div>

              <div className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Paid Out
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-14" />

      {/* FEATURES */}
      <section className="container mx-auto px-4">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-4 rounded-full px-4 py-1">
            Features
          </Badge>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why Join Our Affiliate Program?
          </h2>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Everything you need to grow your audience and earn consistent
            commissions.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;

            return (
              <Card
                key={i}
                className="group rounded-3xl border-border/60 bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <CardHeader>
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${feature.gradient} ${feature.iconColor}`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>

                  <CardTitle className="mt-5 text-xl">
                    {feature.title}
                  </CardTitle>

                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator className="my-14" />

      {/* HOW IT WORKS */}
      <section className="container mx-auto px-4">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-4 rounded-full px-4 py-1">
            Process
          </Badge>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Start earning in a few simple steps.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;

            return (
              <Card
                key={i}
                className="relative overflow-hidden rounded-3xl border-border/60 bg-card/60"
              >
                <CardContent className="relative p-6">
                  {/* IMPORTANT FIX */}
                  <span className="pointer-events-none absolute right-4 top-2 text-7xl font-black text-muted/10">
                    0{i + 1}
                  </span>

                  <div className="relative z-10">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="mt-6 text-xl font-bold">{step.title}</h3>

                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {step.desc}
                    </p>

                    <Button
                      asChild
                      variant="ghost"
                      className="mt-5 h-auto px-0 text-amber-600 hover:bg-transparent hover:text-amber-700 dark:text-amber-400"
                    >
                      <Link
                        href={step.action}
                        className="flex items-center gap-2"
                      >
                        {step.actionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator className="my-14" />

      {/* TESTIMONIALS */}
      <section className="container mx-auto px-4">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-4 rounded-full px-4 py-1">
            Testimonials
          </Badge>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What Our Affiliates Say
          </h2>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Hear from creators already earning through the program.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <Card key={i} className="rounded-3xl border-border/60 bg-card/60">
              <CardContent className="pt-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  &quot;{testimonial.quote}&quot;
                </p>
              </CardContent>

              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <UserPlus className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-semibold">{testimonial.name}</p>

                    <p className="text-sm text-muted-foreground">
                      {testimonial.title}
                    </p>
                  </div>
                </div>

                <Badge variant="secondary" className="mt-4 w-fit rounded-full">
                  <Award className="mr-1 h-3 w-3" />
                  {testimonial.earnings}
                </Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="my-14" />

      {/* FAQ */}
      <section className="container mx-auto px-4">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-4 rounded-full px-4 py-1">
            FAQ
          </Badge>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Everything you need to know about the affiliate program.
          </p>
        </div>

        <Card className="mt-10 rounded-3xl border-border/60 bg-card/60">
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full">
              {[
                {
                  q: "How do payouts work?",
                  a: `Payouts are calculated from successful paid orders made using your referral code. You earn ${commissionRate}% commission excluding taxes and delivery fees.`,
                },
                {
                  q: "When do I get paid?",
                  a: `Payments are processed weekly once you reach the minimum payout threshold of ${minimumPayout}.`,
                },
                {
                  q: "What if a customer refunds?",
                  a: "Refunded or cancelled orders automatically reverse associated commissions.",
                },
                {
                  q: "Is there a cost to join?",
                  a: "No. Joining the affiliate program is completely free.",
                },
                {
                  q: "How do I get my affiliate code?",
                  a: "Once approved, you can create your affiliate code directly from your dashboard.",
                },
              ].map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-border/50"
                >
                  <AccordionTrigger className="py-6 text-left text-base font-semibold hover:no-underline">
                    {item.q}
                  </AccordionTrigger>

                  <AccordionContent className="pb-6 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-14" />

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-4xl border border-amber-500/20 bg-linear-to-br from-amber-500/10 via-background to-orange-500/5 p-8 shadow-xl md:p-14">
          {/* IMPORTANT FIX */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_35%)]" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <Badge className="mb-5 rounded-full border-0 bg-amber-500/10 px-4 py-1.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              Start Today
            </Badge>

            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Ready to Start Earning?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Join hundreds of affiliates already earning commissions. Apply
              today and start sharing premium footwear.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {!user ? (
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl px-8 text-base font-semibold shadow-lg shadow-amber-500/20"
                >
                  <Link
                    href="/sign-in?redirect=/affiliate"
                    className="flex items-center gap-2"
                  >
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : !affiliateStatus.exists ? (
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl px-8 text-base font-semibold shadow-lg shadow-amber-500/20"
                >
                  <Link
                    href="/affiliate/register"
                    className="flex items-center gap-2"
                  >
                    Apply Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : isApproved ? (
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl px-8 text-base font-semibold"
                >
                  <Link
                    href="/affiliate/dashboard"
                    className="flex items-center gap-2"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <div className="rounded-2xl border bg-background/70 px-6 py-4 backdrop-blur">
                  <p className="text-base text-muted-foreground">
                    {isPending
                      ? "Your application is under review"
                      : "Your application was rejected"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
