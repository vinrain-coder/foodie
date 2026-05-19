import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StorefrontRestaurantCard } from "@/lib/actions/restaurant.actions";
import { formatCurrency } from "@/lib/utils";
import { Bike, HandPlatter, MapPin, UtensilsCrossed } from "lucide-react";

export default function RestaurantCard({
  restaurant,
}: {
  restaurant: StorefrontRestaurantCard;
}) {
  const hasLogo = Boolean(restaurant.logo);
  const hasCoverImage = Boolean(restaurant.coverImage);

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      aria-label={`View ${restaurant.name} restaurant`}
      className="group block h-full"
    >
      <Card className="h-full overflow-hidden rounded-xl border-border/60 p-0 shadow-sm transition-all duration-200 md:hover:-translate-y-0.5 md:hover:shadow-lg">
        <div className="relative aspect-16/9 w-full overflow-hidden bg-muted">
          {hasCoverImage ? (
            <Image
              src={restaurant.coverImage}
              alt={`${restaurant.name} cover image`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/30 bg-background">
              {hasLogo ? (
                <Image
                  src={restaurant.logo}
                  alt={`${restaurant.name} logo`}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
              )}
            </div>
            <div>
              <h2 className="line-clamp-1 text-sm font-bold text-white sm:text-base">
                {restaurant.name}
              </h2>
              <p className="line-clamp-1 text-xs text-white/90">
                {restaurant.location}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-3 p-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {restaurant.description}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {restaurant.cuisineTypes.slice(0, 3).map((cuisine) => (
              <Badge key={cuisine} variant="secondary" className="rounded-full">
                {cuisine}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {restaurant.acceptsDelivery ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                <Bike className="h-3.5 w-3.5" />
                Delivery
              </span>
            ) : null}
            {restaurant.acceptsPickup ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                <HandPlatter className="h-3.5 w-3.5" />
                Pickup
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {restaurant.location}
            </span>
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              {restaurant.menuItemsCount} menu item
              {restaurant.menuItemsCount === 1 ? "" : "s"}
            </span>
            <span className="font-semibold">
              Min: {formatCurrency(restaurant.minimumOrderAmount)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
