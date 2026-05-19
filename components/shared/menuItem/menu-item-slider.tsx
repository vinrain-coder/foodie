"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import MenuItemCard from "./menu-item-card";
import { IMenuItem } from "@/lib/db/models/menu.item.model";

export default function MenuItemSlider({
  title,
  menuItems,
  hideDetails = false,
  showTitle = true,
}: {
  title?: string;
  menuItems: IMenuItem[];
  hideDetails?: boolean;
  showTitle?: boolean;
}) {
  return (
    <div className="w-full bg-background">
      {showTitle && <h2 className="h2-bold mb-5">{title}</h2>}
      <Carousel
        opts={{
          align: "start",
          loop: false,
          skipSnaps: true,
          slidesToScroll: "auto",
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {menuItems.map((menuItem) => (
            <CarouselItem
              key={menuItem._id.toString()}
              className={[
                "pl-4 basis-[70%] sm:basis-1/2",
                hideDetails
                  ? "md:basis-1/4 lg:basis-1/6"
                  : "md:basis-1/3 lg:basis-1/5",
              ].join(" ")}
            >
              <div
                style={{
                  contain: "layout style",
                  contentVisibility: "auto",
                  willChange: "transform",
                }}
              >
                <MenuItemCard
                  menuItem={menuItem}
                  hideDetails={hideDetails}
                  hideAddToCart
                  hideBorder
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-0 hidden sm:flex" />
        <CarouselNext className="right-0 hidden sm:flex" />
      </Carousel>
    </div>
  );
}
