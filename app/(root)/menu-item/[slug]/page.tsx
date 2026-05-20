import { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Clock3, Layers, MapPin, Phone, ShieldCheck, Store, Tag, Truck } from "lucide-react";
import AddToCart from "@/components/shared/menuItem/add-to-cart";
import { Card, CardContent } from "@/components/ui/card";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import {
  getMenuItemBySlug,
  getFrequentlyBoughtTogether,
  getRelatedMenuItemsByCategory,
} from "@/lib/actions/menu.item.actions";
import { generateId, round2, toSlug } from "@/lib/utils";
import MenuItemPrice from "@/components/shared/menuItem/price";
import MenuItemGallery from "@/components/shared/menuItem/menu-item-gallery";
import AddToBrowsingHistory from "@/components/shared/menuItem/add-to-browsing-history";
import { Separator } from "@/components/ui/separator";
import BrowsingHistoryList from "@/components/shared/browsing-history-list";
import RatingSummary from "@/components/shared/menuItem/rating-summary";
import MenuItemSlider from "@/components/shared/menuItem/menu-item-slider";
import { getSetting } from "@/lib/actions/setting.actions";
import { getRestaurantSummaryForMenuItem } from "@/lib/actions/restaurant.actions";
import ShareMenuItem from "@/components/shared/menuItem/share-menu-item";
import SubscribeButton from "@/components/shared/menuItem/stock-subscription-button";
import OrderViaWhatsApp from "@/components/shared/menuItem/order-via-whatsapp";
import WishlistButton from "@/components/shared/menuItem/wishlist-button";
import Breadcrumb from "@/components/shared/breadcrumb";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import ReadMore from "@/components/shared/read-more";
import FrequentlyBoughtTogether from "@/components/shared/menuItem/frequently-bought-together";
import { getServerSession } from "@/lib/get-session";
import { PUBLIC_ROBOTS, toAbsoluteUrl } from "@/lib/seo";
import Price from "@/components/shared/menuItem/price";
import { Badge } from "@/components/ui/badge";
import ReviewList from "./review-list";

export async function generateMetadata({
  params,
}: {
  params: any;
}): Promise<Metadata> {
  const { slug } = await params;

  const [menuItem, { site }] = await Promise.all([
    getMenuItemBySlug(slug),
    getSetting(),
  ]);

  if (!menuItem) {
    return {
      title: "Menu Item Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${menuItem.name} | ${menuItem.category}`;
  const description = menuItem.description
    ? menuItem.description.replace(/[#*]/g, "").slice(0, 160)
    : `Order ${menuItem.name} from ${menuItem.category} on ${site.name}. Fresh preparation, secure checkout, and transparent delivery updates.`;

  const ogImageUrl = menuItem.images?.[0]
    ? toAbsoluteUrl(site.url, menuItem.images[0])
    : toAbsoluteUrl(site.url, "/icons/logo.png");

  return {
    title,
    description,
    alternates: {
      canonical: toAbsoluteUrl(site.url, `/menu-item/${menuItem.slug}`),
    },
    robots: PUBLIC_ROBOTS,
    openGraph: {
      title,
      description,
      url: toAbsoluteUrl(site.url, `/menu-item/${menuItem.slug}`),
      siteName: site.name,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: menuItem.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

type Props = {
  params: any;
  searchParams: any;
};

function RelatedLoading() {
  return (
    <div className="p-4">
      <div className="mb-3 h-6 w-56 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-32 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default async function MenuItemDetails({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const [menuItem, { site }, session] = await Promise.all([
    getMenuItemBySlug(slug),
    getSetting(),
    getServerSession(),
  ]);

  if (!menuItem) {
    notFound();
  }

  const relatedMenuItemsPromise = getRelatedMenuItemsByCategory({
    category: menuItem.category,
    menuItemId: menuItem._id.toString(),
    page: Number(query.page || "1"),
  });

  const frequentlyBoughtTogetherPromise = getFrequentlyBoughtTogether(
    menuItem._id.toString(),
  );
  const restaurantDetailsPromise =
    typeof menuItem.restaurant === "string"
      ? getRestaurantSummaryForMenuItem(menuItem.restaurant)
      : null;
  const restaurantDetails = restaurantDetailsPromise
    ? await restaurantDetailsPromise
    : null;

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const priceValidUntil = oneYearFromNow.toISOString().split("T")[0];

  const menuItemJsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    "@id": `${site.url}/menu-item/${menuItem.slug}`,
    name: menuItem.name,
    image: menuItem.images?.filter((img: string) => img && img !== ""),
    description: menuItem.description?.replace(/[#*]/g, ""),
    sku: menuItem._id,
    offers: {
      "@type": "Offer",
      url: toAbsoluteUrl(site.url, `/menu-item/${menuItem.slug}`),
      priceCurrency: "KES",
      price: menuItem.price,
      priceValidUntil,
      availability:
        menuItem.countInStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "KES",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          businessDays: {
            minValue: 1,
            maxValue: 3,
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "KE",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnPeriod",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    ...(menuItem.numReviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: menuItem.avgRating,
            reviewCount: menuItem.numReviews,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };

  return (
    <div className="space-y-8 md:space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(menuItemJsonLd),
        }}
      />

      <AddToBrowsingHistory
        id={menuItem._id.toString()}
        category={menuItem.category}
      />

      <div className="my-1">
        <Breadcrumb />
      </div>

      <section className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-lg shadow-black/5 md:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
          <div className="col-span-2 md:sticky md:top-24">
            <MenuItemGallery
              images={
                menuItem.images?.filter(
                  (img: string) => img && img.trim() !== "",
                ) || []
              }
            />

            {menuItem.videoLink && (
              <div className="mt-3 rounded-2xl border border-border/60 bg-background/80 p-3">
                <h3 className="mb-1 text-sm font-semibold">Menu Preview</h3>
                <a
                  href={menuItem.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Watch here
                </a>
              </div>
            )}
          </div>

          <div className="col-span-2 flex w-full flex-col gap-4 md:px-3">
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="w-fit border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
              >
                Premium Marketplace Pick
              </Badge>

              <div className="flex flex-wrap gap-2">
                {menuItem.category && (
                  <Link
                    href={`/categories/${toSlug(menuItem.category)}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-sm font-medium text-primary/80 transition-colors hover:bg-primary/10"
                  >
                    <Layers className="h-4 w-4 shrink-0" />
                    <span className="leading-none">{menuItem.category}</span>
                  </Link>
                )}

                {menuItem.tags?.slice(0, 2).map((menuTag) => (
                  <Link
                    key={menuTag}
                    href={`/tags/${toSlug(menuTag)}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium transition-colors hover:bg-muted/80"
                  >
                    <Tag className="h-4 w-4 shrink-0" />
                    <span className="leading-none">{menuTag}</span>
                  </Link>
                ))}
              </div>

              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {menuItem.name}
              </h1>

              <p className="sr-only">
                Order {menuItem.name} online in Kenya at {site.name}. Price: KES{" "}
                {menuItem.price}.
              </p>

              <RatingSummary
                avgRating={menuItem.avgRating}
                numReviews={menuItem.numReviews}
                asPopover
                ratingDistribution={menuItem.ratingDistribution}
              />

              <Separator />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Price
                  price={menuItem.price}
                  isDeal={menuItem.tags.includes("todays-deal")}
                  forListing={false}
                />
              </div>
            </div>

            <Separator />

            {menuItem.shortDescription && (
              <p className="my-2 text-sm leading-relaxed text-muted-foreground">
                {menuItem.shortDescription}{" "}
                <Link
                  href="#description"
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  More
                </Link>
              </p>
            )}

            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border/60 bg-background/80 p-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                Fast order processing
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 text-primary" />
                Delivery status updates
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Secure checkout flow
              </div>
            </div>
          </div>

          <div className="md:sticky md:top-24">
            <Card className="rounded-2xl border-border/60 shadow-lg shadow-black/5">
              <CardContent className="flex flex-col gap-4 p-4">
                <MenuItemPrice price={menuItem.price} />

                {menuItem.countInStock > 0 && menuItem.countInStock <= 3 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                    Only {menuItem.countInStock} left. Order soon.
                  </div>
                )}

                {menuItem.countInStock !== 0 ? (
                  <div className="text-xl text-green-700">
                    Available now{" "}
                    <span className="font-semibold text-primary">
                      ({menuItem.countInStock})
                    </span>
                  </div>
                ) : (
                  <div className="text-xl text-destructive">
                    Currently unavailable
                  </div>
                )}

                {menuItem.countInStock !== 0 && (
                  <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
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
                          image: menuItem.images?.[0],
                        }}
                      />
                      <OrderViaWhatsApp
                        menuItemName={menuItem.name}
                        quantity={1}
                        price={menuItem.price}
                      />
                      <WishlistButton menuItemId={menuItem._id.toString()} />
                    </div>
                  </div>
                )}

                {menuItem.countInStock === 0 && (
                  <div className="mt-4 flex items-center justify-center">
                    <SubscribeButton menuItemId={menuItem._id.toString()} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-5xl rounded-3xl border border-border/60 bg-card/75 p-5 shadow-lg shadow-black/5 md:p-6"
        id="description"
      >
        <h2 className="mb-2 text-lg font-semibold">Menu Item Details</h2>
        <ReadMore maxHeight={200}>
          <MarkdownRenderer
            content={menuItem.description}
            className="prose prose-lg max-w-none"
          />
        </ReadMore>
      </section>

      {restaurantDetails && (
        <section className="mx-auto max-w-5xl rounded-3xl border border-border/60 bg-card/75 p-5 shadow-lg shadow-black/5 md:p-6">
          <h2 className="mb-3 text-lg font-semibold">Restaurant Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              <Link
                href={`/restaurants/${restaurantDetails.slug}`}
                className="font-medium text-primary hover:underline"
              >
                {restaurantDetails.name}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{restaurantDetails.location}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              <span>{restaurantDetails.phone}</span>
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">Opening hours: </span>
              {restaurantDetails.openingHours}
            </div>
          </div>
        </section>
      )}

      <div className="my-2 flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/70 p-4">
        <h3 className="font-semibold">Share this menu item</h3>
        <ShareMenuItem slug={menuItem.slug} name={menuItem.name} />
      </div>

      <section
        className="rounded-3xl border border-border/60 bg-card/75 p-5 shadow-lg shadow-black/5 md:p-6"
        id="reviews"
      >
        <h2 className="h2-bold mb-2">Customer Reviews</h2>
        <ReviewList menuItem={menuItem} userId={session?.user?.id || ""} />
      </section>

      <Suspense fallback={null}>
        <FrequentlyBoughtTogetherBoundary
          frequentlyBoughtTogetherPromise={frequentlyBoughtTogetherPromise}
          mainMenuItem={menuItem}
        />
      </Suspense>

      <section className="rounded-3xl border border-border/60 bg-card/70 p-4 shadow-lg shadow-black/5 md:p-5">
        <Suspense fallback={<RelatedLoading />}>
          <RelatedBoundary
            relatedMenuItemsPromise={relatedMenuItemsPromise}
            category={menuItem.category}
          />
        </Suspense>
      </section>

      <section className="rounded-3xl border border-border/60 bg-muted/40 p-4 md:p-6">
        <BrowsingHistoryList className="mt-0" />
      </section>
    </div>
  );
}

async function FrequentlyBoughtTogetherBoundary({
  frequentlyBoughtTogetherPromise,
  mainMenuItem,
}: {
  frequentlyBoughtTogetherPromise: Promise<
    IMenuItem[] | ReturnType<typeof getFrequentlyBoughtTogether>
  >;
  mainMenuItem: IMenuItem;
}) {
  "use cache";
  cacheLife("days");
  const frequentlyBoughtTogether = await frequentlyBoughtTogetherPromise;
  return (
    <FrequentlyBoughtTogether
      mainMenuItem={mainMenuItem}
      frequentlyBoughtTogether={frequentlyBoughtTogether}
    />
  );
}

async function RelatedBoundary({
  relatedMenuItemsPromise,
  category,
}: {
  relatedMenuItemsPromise: Promise<any>;
  category: string;
}) {
  "use cache";
  cacheLife("days");
  const related = await relatedMenuItemsPromise;
  return (
    <MenuItemSlider
      menuItems={related?.data || []}
      title={`More in ${category}`}
    />
  );
}
