"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useCartStore from "@/hooks/use-cart-store";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { cn, generateId, round2 } from "@/lib/utils";

function CardAddToCartSelector({ menuItem }: { menuItem: IMenuItem }) {
  const router = useRouter();
  const { addItem } = useCartStore();

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = Math.max(1, menuItem.countInStock || 1);

  const addToCart = async () => {
    setIsLoading(true);
    try {
      await addItem(
        {
          clientId: generateId(),
          menuItem: menuItem._id.toString(),
          countInStock: menuItem.countInStock,
          name: menuItem.name,
          slug: menuItem.slug,
          category: menuItem.category,
          price: round2(menuItem.price),
          quantity,
          image: menuItem.images?.[0],
        },
        quantity,
      );

      setOpen(false);
      toast.success("Item added to cart", {
        description: `${menuItem.name} x ${quantity}`,
        action: (
          <Button onClick={() => router.push("/cart")}>Go to Cart</Button>
        ),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to add item";
      toast.error(`Could not add item: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="w-auto rounded-full shadow-sm text-sm"
          disabled={menuItem.countInStock < 1}
        >
          <ShoppingCart className="size-4" />
          {menuItem.countInStock > 0 ? "Add to Cart" : "Out of stock"}
        </Button>
      </PopoverTrigger>

      {open && (
        <PopoverContent
          align="end"
          className={cn("w-[min(94vw,320px)] rounded-2xl p-4 sm:w-[320px]")}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold leading-none">Quick add</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                  {menuItem.name}
                </p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {menuItem.countInStock} in stock
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quantity
              </p>
              <div className="flex items-center gap-1 rounded-full border p-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-full"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="min-w-7 text-center text-sm font-medium">
                  {quantity}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-full"
                  onClick={() =>
                    setQuantity((prev) => Math.min(maxQuantity, prev + 1))
                  }
                  disabled={quantity >= maxQuantity}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>

            <Button
              onClick={addToCart}
              disabled={isLoading || menuItem.countInStock < 1}
              className="w-full rounded-full"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Add to cart
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

const MemoizedCardAddToCartSelector = memo(CardAddToCartSelector);
MemoizedCardAddToCartSelector.displayName = "CardAddToCartSelector";

export default MemoizedCardAddToCartSelector;
