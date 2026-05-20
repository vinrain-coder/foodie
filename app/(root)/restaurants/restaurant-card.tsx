import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { StorefrontRestaurantCard } from "@/lib/actions/restaurant.actions";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowUpRight,
  Bike,
  HandPlatter,
  MapPin,
  UtensilsCrossed,
} from "lucide-react";

export default function RestaurantCard({
  restaurant,
}: {
  restaurant: StorefrontRestaurantCard;
}) {
  const hasLogo = Boolean(restaurant.logo);
  const hasCoverImage = Boolean(restaurant.coverImage);
  const logoInitial = restaurant.name.trim().charAt(0).toUpperCase() || "R";

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      aria-label={`View ${restaurant.name} restaurant`}
      className="group block h-full"
    >
      <article className="h-full overflow-hidden rounded-2xl border border-border/70 bg-card/80 transition-colors hover:border-primary/35">
        <div className="relative aspect-16/9 w-full overflow-hidden bg-muted/50">
          {hasCoverImage ? (
            <Image
              src={restaurant.coverImage}
              alt={`${restaurant.name} cover image`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              quality={75}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />

          <div className="absolute right-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
            {restaurant.menuItemsCount} item
            {restaurant.menuItemsCount === 1 ? "" : "s"}
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-2.5">
            <div className="relative h-11 w-11 overflow-hidden rounded-lg border border-white/35 bg-background">
              {hasLogo ? (
                <Image
                  src={restaurant.logo}
                  alt={`${restaurant.name} logo`}
                  fill
                  className="object-cover"
                  sizes="44px"
                  quality={70}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-semibold text-primary">
                  {logoInitial}
                </div>
              )}
            </div>
            <div>
              <h2 className="line-clamp-1 text-sm font-semibold text-white sm:text-base">
                {restaurant.name}
              </h2>
              <p className="line-clamp-1 text-xs text-white/90">
                {restaurant.location}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {restaurant.description}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {restaurant.cuisineTypes.slice(0, 3).map((cuisine) => (
              <Badge
                key={cuisine}
                variant="secondary"
                className="rounded-full border border-border/60 bg-muted/40"
              >
                {cuisine}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {restaurant.acceptsDelivery ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-muted-foreground">
                <Bike className="h-3.5 w-3.5" />
                Delivery
              </span>
            ) : null}
            {restaurant.acceptsPickup ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-muted-foreground">
                <HandPlatter className="h-3.5 w-3.5" />
                Pickup
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {restaurant.location}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-border/70 pt-3 text-sm">
            <span className="text-muted-foreground">Minimum order</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(restaurant.minimumOrderAmount)}
            </span>
          </div>
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              View Restaurant
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
