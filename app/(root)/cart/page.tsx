"use client";

import Breadcrumb from "@/components/shared/breadcrumb";
import BrowsingHistoryList from "@/components/shared/browsing-history-list";
import Price from "@/components/shared/menuItem/price";

import QuantityController from "@/components/shared/menuItem/quantity-controller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import useCartStore from "@/hooks/use-cart-store";
import useSettingStore from "@/hooks/use-setting-store";
import { getMenuItemsByIds } from "@/lib/actions/menu.item.actions";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ChevronLeft,
  LockKeyhole,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function CartPage() {
  const {
    cart: { items, itemsPrice },
    updateItem,
    removeItem,
  } = useCartStore();
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchMenuItems = async () => {
      const uniqueMenuItemIds = [
        ...new Set(items.map((item) => item.menuItem)),
      ];
      if (uniqueMenuItemIds.length === 0) {
        if (active) setMenuItems([]);
        return;
      }

      setLoadingMenuItems(true);
      try {
        const fetchedMenuItems = await getMenuItemsByIds(uniqueMenuItemIds);
        if (active) setMenuItems(fetchedMenuItems);
      } catch {
        if (active) setMenuItems([]);
      } finally {
        if (active) setLoadingMenuItems(false);
      }
    };

    fetchMenuItems();
    return () => {
      active = false;
    };
  }, [items]);

  const router = useRouter();
  const { setting } = useSettingStore();
  const {
    common: { freeShippingMinPrice },
  } = setting;

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items],
  );
  const hasItems = items.length > 0;

  const normalizedFreeShippingMin = Number(freeShippingMinPrice) || 0;
  const amountToFreeShipping = Math.max(
    normalizedFreeShippingMin - itemsPrice,
    0,
  );
  const qualifiesForFreeShipping = amountToFreeShipping <= 0;
  const shippingProgress =
    normalizedFreeShippingMin > 0
      ? Math.min((itemsPrice / normalizedFreeShippingMin) * 100, 100)
      : 100;

  const menuItemsById = useMemo(
    () =>
      new Map(menuItems.map((menuItem) => [menuItem._id.toString(), menuItem])),
    [menuItems],
  );

  return (
    <div className={cn("space-y-6", hasItems && "pb-24 lg:pb-0")}>
      <div className="my-1">
        <Breadcrumb />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {!hasItems ? (
          <Card className="rounded-2xl border-dashed bg-muted/20 p-6 text-center sm:p-12">
            <CardContent className="flex flex-col items-center justify-center space-y-6">
              <div className="rounded-full bg-background p-6 shadow-sm ring-8 ring-background">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Your cart is empty
                </h2>
                <p className="mx-auto max-w-md text-muted-foreground">
                  Looks like you haven&apos;t added anything to your cart yet.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="rounded-full px-8 font-semibold"
              >
                <Link href="/search">Start Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden rounded-2xl border-border/70 bg-linear-to-r from-primary/10 via-primary/5 to-transparent">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      Shopping Cart
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Review your items and proceed to secure checkout.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {totalItems} {totalItems === 1 ? "item" : "items"}
                    </Badge>
                    <Badge
                      variant={qualifiesForFreeShipping ? "success" : "outline"}
                    >
                      {qualifiesForFreeShipping
                        ? "Free shipping unlocked"
                        : `${items.length} menu items in cart`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="space-y-4 lg:col-span-8 xl:col-span-9">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {items.length}{" "}
                    {items.length === 1 ? "menu item" : "menu items"} in your
                    cart
                  </p>
                  <Button
                    variant="ghost"
                    asChild
                    className="h-8 text-muted-foreground hover:text-foreground"
                  >
                    <Link href="/search" className="flex items-center gap-2">
                      <ChevronLeft className="h-4 w-4" />
                      Continue Shopping
                    </Link>
                  </Button>
                </div>

                <Card className="overflow-hidden rounded-xl border-border/60 shadow-sm">
                  <CardContent className="p-0">
                    <div className="hidden grid-cols-12 gap-4 border-b bg-muted/20 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
                      <div className="col-span-7">Menu Item</div>
                      <div className="col-span-2 text-center">Quantity</div>
                      <div className="col-span-3 text-right">Total</div>
                    </div>

                    <div className="divide-y divide-border/60">
                      {items.map((item) => {
                        const menuItem = menuItemsById.get(item.menuItem);

                        return (
                          <div
                            key={item.clientId}
                            className="grid grid-cols-1 gap-6 p-5 transition-colors hover:bg-muted/5 md:grid-cols-12 md:p-6"
                          >
                            <div className="col-span-1 flex gap-4 md:col-span-7">
                              <Link
                                href={`/menu-item/${item.slug}`}
                                className="shrink-0"
                              >
                                <div className="relative h-24 w-24 overflow-hidden rounded-lg border bg-white sm:h-28 sm:w-28">
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    sizes="(max-width: 768px) 96px, 120px"
                                    className="object-contain p-2"
                                  />
                                </div>
                              </Link>

                              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                                <div className="space-y-2">
                                  <Link
                                    href={`/menu-item/${item.slug}`}
                                    className="line-clamp-2 text-base font-semibold leading-tight transition-colors hover:text-primary sm:text-lg"
                                  >
                                    {item.name}
                                  </Link>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    Unit price:{" "}
                                    <Price price={item.price} plain />
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(item)}
                                    className="h-auto p-0 text-destructive hover:bg-transparent hover:text-destructive/80"
                                  >
                                    <Trash2 className="mr-1.5 h-4 w-4" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-1 flex items-center justify-between md:col-span-2 md:justify-center">
                              <span className="text-xs font-medium uppercase text-muted-foreground md:hidden">
                                Quantity
                              </span>
                              <QuantityController
                                quantity={item.quantity}
                                countInStock={item.countInStock}
                                onQuantityChange={(newQuantity) =>
                                  updateItem(item, newQuantity)
                                }
                              />
                            </div>

                            <div className="col-span-1 flex items-center justify-between md:col-span-3 md:justify-end">
                              <span className="text-xs font-medium uppercase text-muted-foreground md:hidden">
                                Total
                              </span>
                              <div className="text-right">
                                <div className="text-lg font-bold sm:text-xl">
                                  <Price
                                    price={item.price * item.quantity}
                                    plain
                                  />
                                </div>
                                {item.quantity > 1 && (
                                  <div className="text-xs text-muted-foreground">
                                    <Price price={item.price} plain /> each
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 lg:col-span-4 xl:col-span-3">
                <Card className="sticky top-4 z-10 rounded-xl border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Items ({totalItems})
                        </span>
                        <Price price={itemsPrice} plain />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-medium text-green-600">
                          Calculated at checkout
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between border-t pt-3">
                        <span className="text-base font-bold">Subtotal</span>
                        <span className="text-2xl font-bold text-primary">
                          <Price price={itemsPrice} plain />
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <span>Free Shipping Progress</span>
                        <span>{Math.round(shippingProgress)}%</span>
                      </div>
                      <Progress value={shippingProgress} className="h-2.5" />

                      {qualifiesForFreeShipping ? (
                        <p className="text-sm font-medium text-green-700">
                          You qualify for free shipping.
                        </p>
                      ) : (
                        <p className="text-sm text-primary">
                          Add{" "}
                          <span className="font-bold">
                            <Price price={amountToFreeShipping} plain />
                          </span>{" "}
                          more to unlock free shipping.
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => router.push("/checkout")}
                      size="lg"
                      className="w-full rounded-full text-base font-bold shadow-md transition-all hover:shadow-lg"
                    >
                      <ShieldCheck className="h-5 w-5" />
                      Secure Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      asChild
                    >
                      <Link href="/search">Continue Shopping</Link>
                    </Button>

                    <div className="grid grid-cols-1 gap-2 rounded-lg border border-dashed bg-background p-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                        Protected checkout and secure payment processing.
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-primary" />
                        Delivery options are confirmed on the checkout screen.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Subtotal
                  </p>
                  <p className="truncate text-lg font-bold text-primary">
                    <Price price={itemsPrice} plain />
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/checkout")}
                  className="rounded-full px-5"
                >
                  Checkout
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {loadingMenuItems && hasItems ? (
        <p className="text-xs text-muted-foreground">
          Updating menu items options and availability...
        </p>
      ) : null}

      <BrowsingHistoryList className="mt-10" />
    </div>
  );
}
