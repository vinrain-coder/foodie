import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export type CardItem = {
  title: string;
  link: { text: string; href: string };
  items: {
    name: string;
    items?: string[];
    image: string;
    href: string;
  }[];
};

export function HomeCard({ cards }: { cards: CardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="group flex h-full flex-col rounded-3xl border border-border/70 bg-card/95 shadow-md shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
        >
          <CardContent className="flex-1 space-y-4 p-5 md:p-6">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {card.title}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {card.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group/item space-y-2"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 45vw, (max-width: 1280px) 20vw, 14vw"
                      className="object-cover transition-transform duration-500 group-hover/item:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent opacity-70" />
                  </div>
                  <p className="truncate text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover/item:text-foreground">
                    {item.name}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>

          <CardFooter className="pt-0 pb-5 px-5 md:px-6">
            <Link
              href={card.link.href}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              {card.link.text}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
