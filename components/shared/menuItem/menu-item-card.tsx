"use client";

import { memo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { cn, formatNumber } from "@/lib/utils";

import Rating from "./rating";
import ImageHover from "./image-hover";
import WishlistIcon from "./wishlist-icon";
import CompareIcon from "./compare-icon";
import CardAddToCartSelector from "./card-add-to-cart-selector";
import SubscribeButton from "./stock-subscription-button";
import Price from "./price";

const MenuItemQuickView = dynamic(() => import("./quick-view"), {
  ssr: false,
});

const getTagStyles = (tag: string) => {
  const normalizedTag = tag.toLowerCase();
  switch (normalizedTag) {
    case "todays-deal":
      return {
        label: "Today's Deal",
        className: "bg-red-600 hover:bg-red-600",
      };
    case "new-arrival":
      return {
        label: "New Arrival",
        className: "bg-blue-600 hover:bg-blue-600",
      };
    case "featured":
      return {
        label: "Featured",
        className: "bg-purple-600 hover:bg-purple-600",
      };
    case "best-seller":
      return {
        label: "Best Seller",
        className: "bg-orange-500 hover:bg-orange-500",
      };
    default:
      return { label: tag, className: "bg-black hover:bg-black" };
  }
};

type LayoutMode = "classic" | "detailed";

type MenuItemCardProps = {
  menuItem: IMenuItem;
  hideDetails?: boolean;
  hideBorder?: boolean;
  hideAddToCart?: boolean;
  isInWishlist?: boolean;
  layout?: LayoutMode;
};

function MenuItemCard({
  menuItem,
  hideBorder = false,
  hideDetails = false,
  hideAddToCart = false,
  isInWishlist = false,
  layout = "classic",
}: MenuItemCardProps) {
  const [mainImage, setMainImage] = useState(
    menuItem.images?.[0] ?? "/placeholder.png",
  );
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const router = useRouter();

  const menuItemId = menuItem._id.toString();
  const menuItemPath = `/menu-item/${menuItem.slug}`;
  const primaryImage = mainImage;
  const hoverImage = menuItem.images?.[1] ?? mainImage;
  const firstTag = menuItem.tags?.[0] ?? null;
  const tagStyle = firstTag ? getTagStyles(firstTag) : null;
  const rawShortDescription =
    menuItem.shortDescription ??
    (menuItem as unknown as { shortdescription?: string }).shortdescription ??
    (menuItem as unknown as { short_description?: string }).short_description;
  const shortDescription =
    rawShortDescription?.trim() ||
    menuItem.description
      ?.replace(/[#*_`>\-]/g, "")
      .trim()
      .slice(0, 210);

  const prefetchMenuItemDetails = () => {
    router.prefetch(menuItemPath);
  };

  return (
    <div
      className="h-full [content-visibility:auto]"
      style={{ contain: "layout paint style", containIntrinsicSize: "360px" }}
    >
      {layout === "detailed" ? (
        <DetailedLayout
          menuItem={menuItem}
          menuItemId={menuItemId}
          primaryImage={primaryImage}
          hoverImage={hoverImage}
          shortDescription={shortDescription}
          tagStyle={tagStyle}
          firstTag={firstTag}
          menuItemPath={menuItemPath}
          prefetchMenuItemDetails={prefetchMenuItemDetails}
          mainImage={mainImage}
          setMainImage={setMainImage}
          isInWishlist={isInWishlist}
          hideAddToCart={hideAddToCart}
        />
      ) : (
        <ClassicLayout
          menuItem={menuItem}
          menuItemId={menuItemId}
          primaryImage={primaryImage}
          hoverImage={hoverImage}
          menuItemPath={menuItemPath}
          prefetchMenuItemDetails={prefetchMenuItemDetails}
          setQuickViewOpen={setQuickViewOpen}
          hideBorder={hideBorder}
          hideDetails={hideDetails}
          hideAddToCart={hideAddToCart}
          isInWishlist={isInWishlist}
        />
      )}

      {quickViewOpen && (
        <MenuItemQuickView
          menuItem={menuItem}
          isOpen={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </div>
  );
}

type ImageSubProps = {
  primaryImage: string;
  hoverImage: string;
  menuItem: IMenuItem;
  menuItemId: string;
  layout: LayoutMode;
  prefetchMenuItemDetails: () => void;
  withFloatingIcons: boolean;
  isInWishlist: boolean;
  onQuickViewOpen?: () => void;
};

const MenuItemImageSub = memo(function MenuItemImageSub({
  primaryImage,
  hoverImage,
  menuItem,
  menuItemId,
  layout,
  prefetchMenuItemDetails,
  withFloatingIcons,
  isInWishlist,
  onQuickViewOpen,
}: ImageSubProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden transition-transform duration-200 motion-reduce:transform-none md:hover:scale-[1.015]",
        layout === "detailed"
          ? "aspect-square min-h-27.5 rounded-md p-2.5 sm:min-h-40 sm:p-3"
          : "aspect-3/4 h-52 sm:h-56",
      )}
    >
      {layout === "classic" && menuItem.tags?.[0] && (
        <Link
          href={`/tags/${encodeURIComponent(menuItem.tags[0])}`}
          className="absolute -top-1.5 left-0 z-10"
        >
          <Badge
            className={cn(
              "rounded-none rounded-br-md border-none px-2 py-0.5 text-[10px] font-bold uppercase text-white",
              getTagStyles(menuItem.tags[0]).className,
            )}
          >
            {getTagStyles(menuItem.tags[0]).label}
          </Badge>
        </Link>
      )}

      {withFloatingIcons && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
          <WishlistIcon
            menuItemId={menuItemId}
            initialInWishlist={isInWishlist}
          />
          {onQuickViewOpen && (
            <button
              onClick={onQuickViewOpen}
              className="h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-background/95 transition-colors hover:bg-background md:hidden"
              title="Quick View"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <CompareIcon menuItem={menuItem} variant="icon" />
        </div>
      )}

      <Link
        href={`/menu-item/${menuItem.slug}`}
        onMouseEnter={prefetchMenuItemDetails}
        onFocus={prefetchMenuItemDetails}
      >
        {(menuItem.images?.length ?? 0) > 1 ? (
          <ImageHover
            src={primaryImage}
            hoverSrc={hoverImage}
            alt={menuItem.name}
            className={cn(
              "object-cover",
              layout === "detailed" && "rounded-md",
            )}
          />
        ) : (
          <Image
            src={primaryImage}
            alt={menuItem.name}
            fill
            sizes={
              layout === "detailed"
                ? "(max-width: 640px) 45vw, (max-width: 1024px) 36vw, 24vw"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            }
            className={cn(
              "object-cover",
              layout === "detailed" && "rounded-md",
            )}
            loading="lazy"
          />
        )}
      </Link>
    </div>
  );
});

type MenuItemDetailsSubProps = {
  menuItem: IMenuItem;
  menuItemPath: string;
  prefetchMenuItemDetails: () => void;
};

const MenuItemDetailsSub = memo(function MenuItemDetailsSub({
  menuItem,
  menuItemPath,
  prefetchMenuItemDetails,
}: MenuItemDetailsSubProps) {
  return (
    <div className="space-y-0.5 text-center">
      <Link
        href={menuItemPath}
        className="line-clamp-2 text-sm font-medium transition hover:text-primary sm:text-base"
        onMouseEnter={prefetchMenuItemDetails}
        onFocus={prefetchMenuItemDetails}
      >
        {menuItem.name}
      </Link>
      <div className="flex justify-center gap-1 text-xs text-gray-500">
        <Rating rating={menuItem.avgRating} size={15} />
        <span>({formatNumber(menuItem.numReviews)})</span>
      </div>
    </div>
  );
});

const AddButtonSub = memo(function AddButtonSub({
  menuItem,
  className,
}: {
  menuItem: IMenuItem;
  className?: string;
}) {
  return (
    <div className={cn("w-full text-center", className)}>
      <CardAddToCartSelector menuItem={menuItem} />
    </div>
  );
});

type ClassicLayoutProps = {
  menuItem: IMenuItem;
  menuItemId: string;
  primaryImage: string;
  hoverImage: string;
  menuItemPath: string;
  prefetchMenuItemDetails: () => void;
  setQuickViewOpen: (open: boolean) => void;
  hideBorder: boolean;
  hideDetails: boolean;
  hideAddToCart: boolean;
  isInWishlist: boolean;
};

const ClassicLayout = memo(function ClassicLayout({
  menuItem,
  menuItemId,
  primaryImage,
  hoverImage,
  menuItemPath,
  prefetchMenuItemDetails,
  setQuickViewOpen,
  hideBorder,
  hideDetails,
  hideAddToCart,
  isInWishlist,
}: ClassicLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {hideBorder ? (
        <div className="relative flex flex-1 flex-col">
          <MenuItemImageSub
            primaryImage={primaryImage}
            hoverImage={hoverImage}
            menuItem={menuItem}
            menuItemId={menuItemId}
            layout="classic"
            prefetchMenuItemDetails={prefetchMenuItemDetails}
            withFloatingIcons
            isInWishlist={isInWishlist}
            onQuickViewOpen={() => setQuickViewOpen(true)}
          />
          {!hideDetails && (
            <>
              <div className="flex-1 p-3 text-center">
                <MenuItemDetailsSub
                  menuItem={menuItem}
                  menuItemPath={menuItemPath}
                  prefetchMenuItemDetails={prefetchMenuItemDetails}
                />
              </div>
              {!hideAddToCart && <AddButtonSub menuItem={menuItem} />}
            </>
          )}
        </div>
      ) : (
        <Card className="relative flex flex-1 flex-col rounded-xl border-border/60 p-0 shadow-sm transition-shadow duration-200 md:hover:shadow-lg">
          <CardHeader className="p-0">
            <MenuItemImageSub
              primaryImage={primaryImage}
              hoverImage={hoverImage}
              menuItem={menuItem}
              menuItemId={menuItemId}
              layout="classic"
              prefetchMenuItemDetails={prefetchMenuItemDetails}
              withFloatingIcons
              isInWishlist={isInWishlist}
              onQuickViewOpen={() => setQuickViewOpen(true)}
            />
          </CardHeader>
          {!hideDetails && (
            <>
              <CardContent className="-mt-6 flex-1 px-0 text-center">
                <MenuItemDetailsSub
                  menuItem={menuItem}
                  menuItemPath={menuItemPath}
                  prefetchMenuItemDetails={prefetchMenuItemDetails}
                />
              </CardContent>
              <CardFooter className="-mt-5 mb-2">
                {menuItem.countInStock === 0 ? (
                  <SubscribeButton menuItemId={menuItemId} />
                ) : (
                  !hideAddToCart && <AddButtonSub menuItem={menuItem} />
                )}
              </CardFooter>
            </>
          )}
        </Card>
      )}
    </div>
  );
});

type DetailedLayoutProps = {
  menuItem: IMenuItem;
  menuItemId: string;
  primaryImage: string;
  hoverImage: string;
  shortDescription: string;
  tagStyle: { label: string; className: string } | null;
  firstTag: string | null;
  menuItemPath: string;
  prefetchMenuItemDetails: () => void;
  mainImage: string;
  setMainImage: (img: string) => void;
  isInWishlist: boolean;
  hideAddToCart: boolean;
};

const DetailedLayout = memo(function DetailedLayout({
  menuItem,
  menuItemId,
  primaryImage,
  hoverImage,
  shortDescription,
  tagStyle,
  firstTag,
  menuItemPath,
  prefetchMenuItemDetails,
  mainImage,
  setMainImage,
  isInWishlist,
  hideAddToCart,
}: DetailedLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <Card className="relative flex flex-1 overflow-hidden rounded-xl border-border/60 p-1 pb-2 shadow-sm transition-shadow duration-200 sm:p-3 md:hover:shadow-lg">
        <div className="absolute top-2 right-2 z-20 flex flex-col items-center gap-1.5 sm:top-3 sm:right-3">
          <WishlistIcon
            menuItemId={menuItemId}
            initialInWishlist={isInWishlist}
          />
          <CompareIcon menuItem={menuItem} variant="icon" />
        </div>

        <div className="grid grid-cols-[104px_1fr] gap-2.5 sm:grid-cols-[144px_1fr] sm:gap-3.5 lg:grid-cols-[220px_1fr] lg:gap-5">
          <div className="w-full">
            <MenuItemImageSub
              primaryImage={primaryImage}
              hoverImage={hoverImage}
              menuItem={menuItem}
              menuItemId={menuItemId}
              layout="detailed"
              prefetchMenuItemDetails={prefetchMenuItemDetails}
              withFloatingIcons={false}
              isInWishlist={isInWishlist}
            />

            {!!menuItem.images?.length && (
              <div className="mt-1.5 flex gap-1 overflow-x-auto pb-1 sm:mt-2 sm:gap-1.5">
                {menuItem.images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setMainImage(image)}
                    className={cn(
                      "relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border transition-all sm:h-12 sm:w-12",
                      mainImage === image
                        ? "border-primary ring-1 ring-primary"
                        : "border-transparent",
                    )}
                  >
                    <Image
                      src={image}
                      alt={`${menuItem.name} ${index + 1}`}
                      fill
                      sizes="48px"
                      className="object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2">
            <div className="flex flex-wrap items-center gap-1.5 pr-9 sm:pr-10">
              {tagStyle && firstTag && (
                <Link href={`/tags/${encodeURIComponent(firstTag)}`}>
                  <Badge
                    className={cn(
                      "h-4 px-1.5 text-[9px] text-white",
                      tagStyle.className,
                    )}
                  >
                    {tagStyle.label}
                  </Badge>
                </Link>
              )}
            </div>

            <Link
              href={menuItemPath}
              className="line-clamp-2 text-sm font-semibold leading-tight hover:text-primary sm:text-base"
            >
              {menuItem.name}
            </Link>

            <Link
              href={menuItemPath}
              className="line-clamp-2 text-xs text-muted-foreground sm:text-sm"
            >
              {shortDescription}
            </Link>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
              <Rating rating={menuItem.avgRating} size={15} />
              <span>({formatNumber(menuItem.numReviews)})</span>
              <span>|</span>
              <span
                className={cn(
                  menuItem.countInStock > 0
                    ? "text-emerald-600"
                    : "text-red-500",
                )}
              >
                {menuItem.countInStock > 0
                  ? `${menuItem.countInStock} in stock`
                  : "Out of stock"}
              </span>
            </div>

            <div className="mt-auto space-y-2 pt-0.5 sm:pt-1">
              <Price
                price={menuItem.price}
                align="start"
                className="text-lg sm:text-xl"
              />

              {menuItem.countInStock === 0 ? (
                <SubscribeButton menuItemId={menuItemId} />
              ) : (
                !hideAddToCart && (
                  <AddButtonSub
                    className="text-left [&>button]:w-full [&>button]:sm:w-auto"
                    menuItem={menuItem}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

const MemoizedMenuItemCard = memo(MenuItemCard);
MemoizedMenuItemCard.displayName = "MenuItemCard";

export default MemoizedMenuItemCard;
