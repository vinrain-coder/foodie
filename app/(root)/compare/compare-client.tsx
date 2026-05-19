"use client";

import type { ReactNode } from "react";
import type { IMenuItem } from "@/lib/db/models/menu.item.model";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useCompareStore } from "@/hooks/useCompareStore";
import { formatNumber, generateId, round2 } from "@/lib/utils";
import { ArrowLeftRight, ArrowRight, Star, X } from "lucide-react";
import AddToCart from "@/components/shared/menuItem/add-to-cart";

const fallback = "—";

export default function CompareClient() {
  const { menuItems, removeMenuItem, clearMenuItems, count, maxItems } =
    useCompareStore();

  if (!menuItems.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <ArrowLeftRight className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Compare Menu Items</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          Add up to {maxItems} menuItems to compare specs side by side
        </p>
        <Link href="/search" className={buttonVariants({ size: "sm" })}>
          Browse MenuItems <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    );
  }

  const rows: Array<[string, (p: IMenuItem) => ReactNode]> = [
    [
      "MenuItem",
      (p) => (
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => removeMenuItem(p._id.toString())}
            className="ml-auto p-1 hover:bg-background rounded-md"
            aria-label="Remove menu item"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <Link href={`/menu-item/${p.slug}`} className="block">
            <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto rounded border overflow-hidden bg-muted">
              <Image
                src={p.images?.[0] ?? "/placeholder.png"}
                alt={p.name}
                fill
                className="object-cover"
              />
            </div>
          </Link>
          <Link
            href={`/menu-item/${p.slug}`}
            className="line-clamp-2 w-32 text-sm font-medium hover:text-primary text-center leading-tight px-1"
          >
            {p.name}
          </Link>
        </div>
      ),
    ],
    [
      "Price",
      (p) => (
        <span className="font-semibold text-base">
          KES {formatNumber(p.price)}
        </span>
      ),
    ],
    [
      "Category",
      (p) => <span className="text-sm">{p.category || fallback}</span>,
    ],
    [
      "Rating",
      (p) => (
        <span className="inline-flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          {p.avgRating.toFixed(1)}{" "}
          <span className="text-muted-foreground">
            ({formatNumber(p.numReviews)})
          </span>
        </span>
      ),
    ],
    [
      "Stock",
      (p) => (
        <span
          className={`text-sm ${p.countInStock > 0 ? "text-green-600" : "text-red-600"}`}
        >
          {p.countInStock > 0 ? `${p.countInStock} left` : "Out of Stock"}
        </span>
      ),
    ],
    [
      "Tags",
      (p) => (
        <span className="text-sm text-muted-foreground">
          {p.tags?.length ? p.tags.join(", ") : fallback}
        </span>
      ),
    ],
    [
      "Action",
      (p) => (
        <div className="pt-2">
          <AddToCart
            minimal
            item={{
              clientId: generateId(),
              menuItem: p._id.toString(),
              countInStock: p.countInStock,
              name: p.name,
              slug: p.slug,
              category: p.category,
              price: round2(p.price),
              quantity: 1,
              image: p.images?.[0],
            }}
          />
        </div>
      ),
    ],
  ];

  return (
    <div className="container mx-auto py-4 md:py-6 max-w-6xl space-y-4">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold truncate">
            Compare Meni Items
          </h1>
          <p className="text-sm text-muted-foreground">
            {count}/{maxItems} menuItems
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Link
            href="/search"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "text-sm",
            })}
          >
            Add More
          </Link>

          <button
            type="button"
            onClick={clearMenuItems}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "text-sm",
            })}
          >
            Clear
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg relative">
        <table className="w-full border-collapse min-w-max">
          <tbody className="divide-y text-base">
            {rows.map(([label, valueFn], idx) => (
              <tr key={label + idx} className="hover:bg-muted/20">
                {/* LEFT FIXED COLUMN */}
                <td
                  className="
                  sticky left-0 z-30
                  bg-background
                  p-3 md:p-4
                  text-sm font-bold
                  w-28 md:w-40
                  whitespace-nowrap
                  border-r
                "
                >
                  {label}
                </td>

                {/* PRODUCT COLUMNS */}
                {menuItems.map((menuItem) => (
                  <td
                    key={menuItem._id.toString() + label}
                    className="
                    p-3 md:p-4
                    text-center
                    align-top
                    min-w-40 md:min-w-50
                    border-l
                    bg-background
                    whitespace-normal
                    wrap-break-word
                  "
                  >
                    {valueFn(menuItem)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
