import { Suspense } from "react";
import AddToCart from "@/components/shared/menuItem/add-to-cart";
import { Card, CardContent } from "@/components/ui/card";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import {
  getMenuItemBySlug,
  getFrequentlyBoughtTogether,
  getRelatedMenuItemsByCategory,
} from "@/lib/actions/menu.item.actions";
import ReviewList from "./review-list";
import { generateId, round2 } from "@/lib/utils";
import SelectVariant from "@/components/shared/menuItem/select-variant";
import MenuItemPrice from "@/components/shared/menuItem/price";
import MenuItemGallery from "@/components/shared/menuItem/menu-item-gallery";
import AddToBrowsingHistory from "@/components/shared/menuItem/add-to-browsing-history";
import { Separator } from "@/components/ui/separator";
import BrowsingHistoryList from "@/components/shared/browsing-history-list";
import RatingSummary from "@/components/shared/menuItem/rating-summary";
import MenuItemSlider from "@/components/shared/menuItem/menu-item-slider";
import { getSetting } from "@/lib/actions/setting.actions";
import ShareMenuItem from "@/components/shared/menuItem/share-menu-item";
import SubscribeButton from "@/components/shared/menuItem/stock-subscription-button";
import OrderViaWhatsApp from "@/components/shared/menuItem/order-via-whatsapp";
import WishlistButton from "@/components/shared/menuItem/wishlist-button";
import { cacheLife } from "next/cache";
import Breadcrumb from "@/components/shared/breadcrumb";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import ReadMore from "@/components/shared/read-more";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Factory, Layers, Tag } from "lucide-react";
import CompareButton from "@/components/shared/menuItem/compare-button";
import FrequentlyBoughtTogether from "@/components/shared/menuItem/frequently-bought-together";
import { getServerSession } from "@/lib/get-session";
import { PUBLIC_ROBOTS, toAbsoluteUrl } from "@/lib/seo";
import Price from "@/components/shared/menuItem/price";

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
      title: "MenuItem Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${menuItem.name} || menuItem.category}`;

  const description = menuItem.description
    ? menuItem.description.replace(/[#*]/g, "").slice(0, 160) // Clean markdown and trim
    : `Shop the ${menuItem.name} by ${menuItem.category} at ${
        site.name
      }. Authentic quality, KES ${
        menuItem.price
      }, and fast delivery across Kenya.`;

  const ogImageUrl = menuItem.images?.[0]
    ? toAbsoluteUrl(site.url, menuItem.images[0])
    : toAbsoluteUrl(site.url, "/icons/logo.png");

  return {
    title,
    description,
    alternates: {
      canonical: toAbsoluteUrl(site.url, `/menuItem/${menuItem.slug}`),
    },
    robots: PUBLIC_ROBOTS,

    openGraph: {
      title,
      description,
      url: toAbsoluteUrl(site.url, `/menu-item/${menuItem.slug}`),
      siteName: site.name,
      type: "website", // Use "website" or "og:menuItem" if supported by your provider
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

function ReviewsLoading() {
  return (
    <div id="reviews-loading" className="p-4 bg-white rounded-lg shadow-sm">
      <div className="h-6 w-48 bg-gray-200 rounded mb-3 animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

function RelatedLoading() {
  return (
    <div className="p-4">
      <div className="h-6 w-56 bg-gray-200 rounded mb-3 animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
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

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const priceValidUntil = oneYearFromNow.toISOString().split("T")[0];
  const menuItemJsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    "@id": `${site.url}/menuItem/${menuItem.slug}`,
    name: menuItem.name,
    image: menuItem.images?.filter((img: string) => img && img !== ""),
    description: menuItem.description?.replace(/[#*]/g, ""),
    sku: menuItem._id,
    offers: {
      "@type": "Offer",
      url: toAbsoluteUrl(site.url, `/menuItem/${menuItem.slug}`),
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
          value: "0", // Change if you have shipping costs
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

    // This enables Star Ratings in Google

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
    <div>
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

      <section>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* LEFT: Gallery & video — relatively static per menuItem and fast to resolve */}

          <div className="col-span-2 md:sticky md:top-24">
            <MenuItemGallery
              images={
                menuItem.images?.filter(
                  (img: string) => img && img.trim() !== "",
                ) || []
              }
            />

            {menuItem.videoLink && (
              <div className="mt-2">
                <h3 className="font-semibold mb-2">MenuItem Video</h3>

                <a
                  href={menuItem.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Watch here
                </a>
              </div>
            )}
          </div>

          {/* CENTER: Core menuItem info — price, variant selection, description */}

          <div className="flex w-full flex-col gap-2 md:p-5 col-span-2">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {menuItem.category && (
                  <Link
                    href={`/categories/${menuItem.category}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 hover:bg-primary/10 px-3 py-1 text-sm font-medium text-primary/80 transition-colors"
                  >
                    <Layers className="h-4 w-4 shrink-0" />
                    <span className="leading-none">{menuItem.category}</span>
                  </Link>
                )}

                {menuItem.tags?.[0] && (
                  <Link
                    href={`/tags/${menuItem.tags[0]}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium hover:bg-muted-200 transition-colors"
                  >
                    <Tag className="h-4 w-4 shrink-0" />
                    <span className="leading-none">{menuItem.tags[0]}</span>
                  </Link>
                )}
              </div>

              <h1 className="font-bold text-lg lg:text-xl">
                {menuItem.name}{" "}
                <span className="sr-only">Buy Online in Kenya</span>
              </h1>

              <p className="sr-only">
                Buy {menuItem.name} online in Kenya at {site.name}. Price: KES{" "}
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

            <Separator className="my-2" />

            {menuItem.shortDescription && (
              <p className="text-sm leading-relaxed text-muted-foreground my-4">
                {menuItem.shortDescription}{" "}
                <Link
                  href="#description"
                  className="font-medium text-primary hover:underline gap-2 inline-flex items-center"
                >
                  More
                </Link>
              </p>
            )}
          </div>

          {/* RIGHT: buy card (fast to show) */}

          <div className="md:sticky md:top-24">
            <Card>
              <CardContent className="p-4 flex flex-col gap-4">
                <MenuItemPrice price={menuItem.price} />
                {menuItem.countInStock > 0 && menuItem.countInStock <= 3 && (
                  <div className="text-destructive font-bold">
                    Only {menuItem.countInStock} left in stock - order soon
                  </div>
                )}
                {menuItem.countInStock !== 0 ? (
                  <div className="text-green-700 text-xl">
                    In Stock{" "}
                    <span className="text-primary font-semibold">
                      ({menuItem.countInStock})
                    </span>
                  </div>
                ) : (
                  <div className="text-destructive text-xl">Out of Stock</div>
                )}
                {menuItem.countInStock !== 0 && (
                  <div className="flex justify-center items-center">
                    <div className="flex flex-col gap-2 items-center">
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

                      <CompareButton menuItem={menuItem} />
                    </div>
                  </div>
                )}
                {menuItem.countInStock === 0 && (
                  <div className="flex justify-center items-center mt-4">
                    <SubscribeButton menuItemId={menuItem._id.toString()} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mt-10 max-w-5xl mx-auto" id="description">
        <h2 className="font-bold text-lg mb-2 underline">Description</h2>
        <ReadMore maxHeight={200}>
          <MarkdownRenderer
            content={menuItem.description}
            className="prose prose-lg max-w-none"
          />
        </ReadMore>
      </section>

      <div className="flex flex-col gap-2 my-5">
        <h3 className="font-semibold">Share this menu item</h3>
        <ShareMenuItem slug={menuItem.slug} name={menuItem.name} />
      </div>

      <section className="mt-8 md:mt-10" id="reviews">
        <h2 className="h2-bold mb-2">Customer Reviews</h2>
        <ReviewList menuItem={menuItem} userId={session?.user?.id || ""} />
      </section>

      <Suspense fallback={null}>
        <FrequentlyBoughtTogetherBoundary
          frequentlyBoughtTogetherPromise={frequentlyBoughtTogetherPromise}
          mainMenuItem={menuItem}
        />
      </Suspense>

      <section className="mt-10">
        <Suspense fallback={<RelatedLoading />}>
          <RelatedBoundary
            relatedMenuItemsPromise={relatedMenuItemsPromise}
            category={menuItem.category}
          />
        </Suspense>
      </section>

      <BrowsingHistoryList className="mt-10" />
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
      title={`Best Sellers in ${category}`}
    />
  );
}
