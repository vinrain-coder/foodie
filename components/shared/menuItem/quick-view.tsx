"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { generateId, round2 } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import SubscribeButton from "./stock-subscription-button";
import MarkdownRenderer from "../markdown-renderer";
import ReadMore from "../read-more";
import { Badge } from "@/components/ui/badge";
import Price from "./price";
import MenuItemGallery from "./menu-item-gallery";
import AddToCart from "./add-to-cart";

interface QuickViewProps {
  menuItem: IMenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MenuItemQuickView({
  menuItem,
  isOpen,
  onClose,
}: QuickViewProps) {
  const isMobile = useIsMobile();

  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [selectedSize, setSelectedSize] = useState<string | undefined>();

  if (!menuItem) return null;

  const primaryImage = menuItem.images?.[0] ?? "/placeholder.png";

  const details = (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h2 className="font-semibold text-2xl">{menuItem.name}</h2>

      <Price price={menuItem.price} />

      <Separator />
      <section className="max-w-5xl mx-auto">
        <h2 className="font-bold text-lg mb-2">Menu Item Description</h2>
        <ReadMore maxHeight={180}>
          <MarkdownRenderer
            content={menuItem.description}
            className="prose prose-lg max-w-none"
          />
        </ReadMore>
      </section>

      {menuItem.countInStock === 0 ? (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Badge variant="destructive" className="w-fit">
            Out of stock
          </Badge>
          <p className="text-sm text-muted-foreground">
            This item is currently unavailable. Subscribe to get notified as
            soon as it is back in stock.
          </p>
          <SubscribeButton menuItemId={menuItem._id.toString()} />
        </div>
      ) : (
        <AddToCart
          item={{
            clientId: generateId(),
            menuItem: menuItem._id.toString(),
            countInStock: menuItem.countInStock,
            name: menuItem.name,
            slug: menuItem.slug,
            category: menuItem.category,
            price: round2(menuItem.price),
            quantity: 1,
            image: primaryImage,
          }}
        />
      )}

      {menuItem.countInStock > 0 && menuItem.countInStock <= 3 && (
        <div className="text-destructive font-bold">
          Only {menuItem.countInStock} left in stock - order soon
        </div>
      )}
    </div>
  );

  return isMobile ? (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="p-0 max-h-[95vh] flex flex-col">
        <DrawerTitle className="sr-only">{menuItem.name}</DrawerTitle>
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="px-4 pt-4">
            <MenuItemGallery images={menuItem.images} />
            {menuItem.videoLink && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Menu Item Video</h3>
                <a
                  href={menuItem.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Watch Here
                </a>
              </div>
            )}
          </div>
          {details}
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 w-full h-[70vh] overflow-hidden rounded-2xl grid grid-cols-1 md:grid-cols-2 md:gap-6 max-w-2xl md:max-w-6xl!">
        <DialogTitle className="sr-only">{menuItem.name}</DialogTitle>

        <div className="p-6 overflow-y-auto">
          <MenuItemGallery images={menuItem.images} />
          {menuItem.videoLink && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Menu Item Video</h3>
              <a
                href={menuItem.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Watch Here
              </a>
            </div>
          )}
        </div>

        <div className="overflow-y-auto">{details}</div>
      </DialogContent>
    </Dialog>
  );
}
