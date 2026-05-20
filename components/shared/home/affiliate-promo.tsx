import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Handshake,
  Megaphone,
  Store,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const growthFeatures = [
  {
    icon: Store,
    title: "Restaurant brand visibility",
    description:
      "Promote partner restaurants with trusted creators and high-intent audiences.",
    tone: "text-amber-700 bg-amber-500/15",
  },
  {
    icon: Megaphone,
    title: "Trackable campaign codes",
    description:
      "Run measurable referral campaigns with transparent performance attribution.",
    tone: "text-sky-700 bg-sky-500/15",
  },
  {
    icon: BarChart3,
    title: "Live conversion insights",
    description:
      "Monitor clicks, orders, and revenue contribution in real time.",
    tone: "text-teal-700 bg-teal-500/15",
  },
  {
    icon: Wallet,
    title: "Reliable payout pipeline",
    description:
      "Streamlined payout workflows that keep affiliates and partners motivated.",
    tone: "text-emerald-700 bg-emerald-500/15",
  },
];

export default function AffiliatePromo() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-lg shadow-black/5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(13,148,136,.16),transparent_35%),radial-gradient(circle_at_100%_100%,rgba(245,158,11,.14),transparent_35%)]" />
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="relative p-6 md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Handshake className="h-3.5 w-3.5" />
            Growth Engine
          </div>

          <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Scale demand for partner restaurants with affiliate-led acquisition.
          </h3>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Built-in affiliate tooling helps your marketplace attract new
            customers while preserving clear unit economics for restaurants.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {growthFeatures.map((feature) => (
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
              <Link href="/affiliate">
                Launch affiliate channel
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Performance tracking, transparent commissions, and payout control.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
