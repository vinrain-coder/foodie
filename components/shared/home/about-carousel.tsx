"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BellRing,
  ClipboardCheck,
  CookingPot,
  Handshake,
  Rocket,
  Store,
} from "lucide-react";

const platformSteps = [
  {
    icon: Store,
    title: "Restaurant onboarding",
    description:
      "Restaurants join, publish menus, set availability, and configure their operational preferences.",
    accent: "from-amber-500/20 to-amber-300/5 text-amber-700",
  },
  {
    icon: Rocket,
    title: "Premium discovery",
    description:
      "Customers discover restaurants and dishes through curated categories, tags, and featured placements.",
    accent: "from-teal-500/20 to-teal-300/5 text-teal-700",
  },
  {
    icon: ClipboardCheck,
    title: "Checkout confidence",
    description:
      "Orders move through a clear, low-friction checkout that reduces drop-off and improves conversion.",
    accent: "from-sky-500/20 to-sky-300/5 text-sky-700",
  },
  {
    icon: BellRing,
    title: "Real-time updates",
    description:
      "Restaurants receive and process incoming orders quickly while customers stay informed at every stage.",
    accent: "from-orange-500/20 to-orange-300/5 text-orange-700",
  },
  {
    icon: CookingPot,
    title: "Fulfillment flow",
    description:
      "Restaurant teams handle preparation and fulfillment while the platform maintains a consistent customer UX.",
    accent: "from-emerald-500/20 to-emerald-300/5 text-emerald-700",
  },
  {
    icon: Handshake,
    title: "Retention loop",
    description:
      "Coupons, loyalty patterns, and personalized browsing history bring customers back to partner restaurants.",
    accent: "from-slate-500/20 to-slate-300/5 text-slate-700",
  },
];

export function AboutCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 4200, stopOnInteraction: false }),
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 p-5 shadow-lg shadow-black/5 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_5%_8%,rgba(245,158,11,.12),transparent_32%),radial-gradient(circle_at_96%_94%,rgba(20,184,166,.12),transparent_34%)]" />
      <div className="relative z-10">
        <div className="mb-7 md:mb-9">
          <Badge
            variant="outline"
            className="mb-3 border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            Platform Workflow
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
            Built as the bridge between diners and restaurants
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">
            Every part of the journey is optimized so customers can order
            faster and restaurants can operate smarter.
          </p>
        </div>

        <div className="block md:hidden">
          <Carousel
            dir="ltr"
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent className="-ml-3">
              {platformSteps.map((item) => (
                <CarouselItem key={item.title} className="pl-3 basis-[86%]">
                  <Card className="h-full rounded-2xl border-border/60 bg-background/90">
                    <CardContent className="space-y-3 p-5">
                      <div
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br ${item.accent}`}
                      >
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-4 flex justify-center gap-2">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>

        <div className="hidden grid-cols-2 gap-4 md:grid lg:grid-cols-3">
          {platformSteps.map((item) => (
            <Card
              key={item.title}
              className="group h-full rounded-2xl border-border/60 bg-background/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
            >
              <CardContent className="space-y-3 p-5">
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br ${item.accent}`}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
