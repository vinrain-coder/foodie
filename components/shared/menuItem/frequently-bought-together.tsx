"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { formatCurrency, generateId, round2 } from "@/lib/utils";
import useCartStore from "@/hooks/use-cart-store";

interface FrequentlyBoughtTogetherProps {
  mainMenuItem: IMenuItem;
  frequentlyBoughtTogether: IMenuItem[];
}

export default function FrequentlyBoughtTogether({
  mainMenuItem,
  frequentlyBoughtTogether,
}: FrequentlyBoughtTogetherProps) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([
    mainMenuItem._id.toString(),
    ...frequentlyBoughtTogether.map((p) => p._id.toString()),
  ]);
  const [isLoading, setIsLoading] = useState(false);

  if (frequentlyBoughtTogether.length === 0) return null;

  const allMenuItems = [mainMenuItem, ...frequentlyBoughtTogether];
  const selectedMenuItems = allMenuItems.filter((p) =>
    selectedIds.includes(p._id.toString()),
  );

  const totalPrice = selectedMenuItems.reduce((acc, p) => acc + p.price, 0);

  const toggleMenuItem = (id: string) => {
    if (id === mainMenuItem._id.toString()) return; // Main menuItem is always selected
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleAddSelectedToCart = async () => {
    setIsLoading(true);
    try {
      let lastClientId = "";
      for (const menuItem of selectedMenuItems) {
        lastClientId = await addItem(
          {
            clientId: generateId(),
            menuItem: menuItem._id.toString(),
            countInStock: menuItem.countInStock,
            name: menuItem.name,
            slug: menuItem.slug,
            category: menuItem.category,
            price: round2(menuItem.price),
            quantity: 1,
            image: menuItem.images?.[0],
          },
          1,
        );
      }
      toast.success("Items added to cart");
      router.push(`/cart/${lastClientId}`);
    } catch (error: any) {
      toast.error(`Error adding to cart: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-xl font-bold mb-6">Frequently bought together</h2>
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex items-center flex-wrap gap-4">
          {allMenuItems.map((menuItem, index) => (
            <div
              key={menuItem._id.toString()}
              className="flex items-center gap-4"
            >
              <div className="relative group">
                <Link href={`/menuItem/${menuItem.slug}`}>
                  <div className="relative h-24 w-24 sm:h-32 sm:w-32 border rounded-md overflow-hidden bg-secondary">
                    <Image
                      src={menuItem.images?.[0] || "/placeholder.png"}
                      alt={menuItem.name}
                      fill
                      className="object-cover p-0 rounded-md"
                    />
                  </div>
                </Link>
                {index === 0 && (
                  <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-br-md font-medium">
                    This item
                  </div>
                )}
              </div>
              {index < allMenuItems.length - 1 && (
                <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>

        <Card className="w-full lg:w-80">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              {allMenuItems.map((menuItem) => (
                <div
                  key={menuItem._id.toString()}
                  className="flex items-start gap-2 text-sm"
                >
                  <Checkbox
                    id={`check-${menuItem._id}`}
                    checked={
                      selectedIds.includes(menuItem._id.toString()) &&
                      menuItem.countInStock > 0
                    }
                    onCheckedChange={() =>
                      toggleMenuItem(menuItem._id.toString())
                    }
                    disabled={
                      menuItem._id.toString() === mainMenuItem._id.toString() ||
                      menuItem.countInStock === 0
                    }
                    className="cursor-pointer"
                  />
                  <label
                    htmlFor={`check-${menuItem._id}`}
                    className="leading-tight cursor-pointer"
                  >
                    <span
                      className={
                        menuItem._id.toString() === mainMenuItem._id.toString()
                          ? "font-bold"
                          : ""
                      }
                    >
                      {menuItem._id.toString() === mainMenuItem._id.toString()
                        ? "This item: "
                        : ""}
                    </span>
                    <span className="hover:text-primary transition-colors">
                      {menuItem.name}
                    </span>
                    <span className="ml-1 font-semibold">
                      {formatCurrency(menuItem.price)}
                    </span>
                    <span className="ml-1 text-destructive/90 text-xs">
                      {menuItem.countInStock === 0 ? "(Out of stock)" : ""}
                    </span>
                  </label>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span>Total price:</span>
                <span className="text-xl text-primary">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <Button
                className="w-full rounded-full"
                onClick={handleAddSelectedToCart}
                disabled={isLoading || selectedIds.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  `Add ${selectedIds.length} items to cart`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
