// CouponPromo.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Calendar,
  Flame,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";

export default function CouponPromo() {
  return (
    <section className="relative overflow-hidden rounded-4xl border bg-linear-to-br from-amber-50 via-background to-orange-50 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.15),transparent_35%)]" />

      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="relative p-6 md:p-10">
          <div className="mx-auto max-w-4xl">
            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Verified & Updated Daily
            </div>

            {/* Heading */}
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <Tag className="h-8 w-8 text-amber-600" />
              </div>

              <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
                Save More With Exclusive Coupons
              </h2>

              <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
                Unlock verified discount codes, flash sales, and limited-time
                offers on premium footwear and trending collections.
              </p>
            </div>

            {/* Features */}
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                {
                  icon: Users,
                  title: "Member-Only Deals",
                  desc: "Access exclusive savings reserved for registered shoppers.",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                },
                {
                  icon: Flame,
                  title: "Flash Sales",
                  desc: "Limited-time discounts on top-selling products.",
                  color: "text-orange-500",
                  bg: "bg-orange-500/10",
                },
                {
                  icon: Calendar,
                  title: "Fresh Daily Offers",
                  desc: "New coupons and promotions updated every day.",
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                },
                {
                  icon: Tag,
                  title: "Flexible Discounts",
                  desc: "Enjoy both sitewide and category-specific coupon codes.",
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
                <Link href="/coupons">
                  Browse Coupons
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <p className="text-sm text-muted-foreground">
                Updated daily • Verified deals • No hidden conditions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
