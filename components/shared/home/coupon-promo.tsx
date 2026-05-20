import Link from "next/link";
import { ArrowRight, Clock3, PercentCircle, Sparkles, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const retentionFeatures = [
  {
    icon: Users,
    title: "Segmented customer offers",
    description:
      "Launch targeted deals for first-time, returning, and high-frequency customers.",
    tone: "text-sky-700 bg-sky-500/15",
  },
  {
    icon: Clock3,
    title: "Peak-hour demand shaping",
    description:
      "Use timed promotions to balance order load and improve restaurant throughput.",
    tone: "text-orange-700 bg-orange-500/15",
  },
  {
    icon: PercentCircle,
    title: "Flexible discount logic",
    description:
      "Run fixed or percentage discounts by campaign goals and margin targets.",
    tone: "text-emerald-700 bg-emerald-500/15",
  },
  {
    icon: Ticket,
    title: "Verified coupon integrity",
    description:
      "Deliver trusted, current offers to keep customer confidence high.",
    tone: "text-amber-700 bg-amber-500/15",
  },
];

export default function CouponPromo() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-lg shadow-black/5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(251,146,60,.18),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(14,165,233,.14),transparent_35%)]" />
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="relative p-6 md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Retention Layer
          </div>

          <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Turn promotions into a predictable repeat-order engine.
          </h3>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Coupon capabilities are designed for growth teams to increase
            customer lifetime value while helping restaurants sustain healthy
            demand.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {retentionFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border/70 bg-background/90 p-4"
              >
                <div
                  className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${feature.tone}`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-semibold">{feature.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="h-10 rounded-xl px-5">
              <Link href="/coupons">
                Explore active offers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Verified deals, refresh cadence, and coupon governance for teams.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
