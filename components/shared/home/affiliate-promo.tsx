// AffiliatePromo.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

export default function AffiliatePromo() {
  return (
    <section className="relative overflow-hidden rounded-4xl border bg-linear-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/20 dark:via-background dark:to-amber-950/20">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.15),transparent_35%)]" />

      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="relative p-6 md:p-10">
          <div className="mx-auto max-w-4xl">
            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Trusted by Creators & Influencers
            </div>

            {/* Heading */}
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Wallet className="h-8 w-8 text-emerald-600" />
              </div>

              <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
                Earn With Our Affiliate Program
              </h2>

              <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
                Share products you love, grow your audience, and earn
                commissions from every successful referral.
              </p>
            </div>

            {/* Features */}
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                {
                  icon: Users,
                  title: "Audience Discounts",
                  desc: "Offer your followers exclusive promo codes and deals.",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                },
                {
                  icon: BarChart3,
                  title: "Live Analytics",
                  desc: "Track clicks, conversions, and commissions in real time.",
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                },
                {
                  icon: CheckCircle2,
                  title: "500+ Active Affiliates",
                  desc: "Join a growing network of successful creators.",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10",
                },
                {
                  icon: BadgeDollarSign,
                  title: "Competitive Payouts",
                  desc: "Earn generous commissions on every qualified sale.",
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border bg-background/70 p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg}`}
                    >
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl px-8 text-base"
              >
                <Link href="/affiliate">
                  Join Affiliate Program
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <p className="text-sm text-muted-foreground">
                No upfront fees • Fast payouts • Real-time tracking
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
