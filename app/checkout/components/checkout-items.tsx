"use client";

import Image from "next/image";
import { OrderItem } from "@/types";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import QuantityController from "@/components/shared/menuItem/quantity-controller";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import Price from "@/components/shared/menuItem/price";

interface CheckoutItemsProps {
  items: OrderItem[];
  menuItems: IMenuItem[];
  updateItem: (
    item: OrderItem,
    quantity: number,
    color?: string,
    size?: string,
  ) => void;
  removeItem: (item: OrderItem) => void;
}

export const CheckoutItems = ({
  items,
  menuItems,
  updateItem,
  removeItem,
}: CheckoutItemsProps) => {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 gap-4 py-2">
          <div className="relative w-10 h-10 shrink-0 sm:w-16 sm:h-16">
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="20vw"
              className="object-contain"
            />
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="font-semibold wrap-anywhere">{item.name}</p>
            <p className="font-bold">
              <Price price={item.price} plain />
            </p>

            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <QuantityController
                  quantity={item.quantity}
                  countInStock={item.countInStock}
                  onQuantityChange={(newQuantity) =>
                    updateItem(item, newQuantity)
                  }
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove item"
                  onClick={() => removeItem(item)}
                  className="h-8 w-8 rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
