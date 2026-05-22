import Link from "next/link";
import {
  ArrowRight,
  Bike,
  Clock3,
  MapPinned,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const riderFeatures = [
  {
    icon: Bike,
    title: "Structured delivery flow",
    description:
      "Accept jobs, confirm pickup, and complete drop-offs with OTP validation.",
    tone: "text-indigo-700 bg-indigo-500/15",
  },
  {
    icon: MapPinned,
    title: "Live location handoff",
    description:
      "Share rider location updates for better customer visibility and trust.",
    tone: "text-cyan-700 bg-cyan-500/15",
  },
  {
    icon: Clock3,
    title: "Faster turnaround",
    description:
      "Reduce dispatch lag with rider availability status and active-job control.",
    tone: "text-amber-700 bg-amber-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Delivery proof safety",
    description:
      "OTP-secured completion prevents accidental or fraudulent handoffs.",
    tone: "text-emerald-700 bg-emerald-500/15",
  },
];

export default function RiderPromo() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-lg shadow-black/5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_10%,rgba(99,102,241,.18),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(6,182,212,.15),transparent_35%)]" />
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="relative p-6 md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Smartphone className="h-3.5 w-3.5" />
            Last Mile Ops
          </div>

          <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Power your delivery fleet with a rider-first workflow.
          </h3>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Riders get a focused execution dashboard while operations teams keep
            delivery progress tightly aligned with order status.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {riderFeatures.map((feature) => (
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
              <Link href="/rider-signup">
                Become a rider
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-10 rounded-xl px-5">
              <Link href="/rider/jobs">
                I'm already a rider
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
