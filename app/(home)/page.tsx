import { Suspense } from "react";
import { HomeCarousel } from "@/components/shared/home/home-carousel";
import { AboutCarousel } from "@/components/shared/home/about-carousel";
import BlogSlider from "@/components/shared/blog/blog-slider";
import BrowsingHistoryList from "@/components/shared/browsing-history-list";
import { HomeCard } from "@/components/shared/home/home-card";
import MenuItemSlider from "@/components/shared/menuItem/menu-item-slider";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublishedBlogs } from "@/lib/actions/blog.actions";
import {
  getMenuItemsForCard,
  getMenuItemsByTag,
} from "@/lib/actions/menu.item.actions";
import { getSetting } from "@/lib/actions/setting.actions";
import { cacheLife } from "next/cache";
import { getAllCategoriesForStore } from "@/lib/actions/category.actions";
import { getAllTagsForStore } from "@/lib/actions/tag.actions";
import { Metadata } from "next";
import AffiliatePromo from "@/components/shared/home/affiliate-promo";
import CouponPromo from "@/components/shared/home/coupon-promo";
import { toAbsoluteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const {
    site: { description, url, name },
  } = await getSetting();

  return {
    title: "Home",
    description,
    alternates: {
      canonical: toAbsoluteUrl(url),
    },
    openGraph: {
      title: `${name} Home`,
      description,
      url: toAbsoluteUrl(url),
      type: "website",
    },
  };
}

/* ---------------- CAROUSEL ---------------- */
const AsyncHomeCarousel = async () => {
  "use cache";
  cacheLife("days");

  const { carousels } = await getSetting();
  const publishedCarousels = carousels.filter(
    (carousel) => carousel.isPublished,
  );

  return <HomeCarousel items={publishedCarousels} />;
};

const AsyncBestSellingMenuItems = async () => {
  "use cache";
  cacheLife("days");

  const bestSellingMenuItems = await getMenuItemsByTag({
    tag: "best-seller",
  });

  return (
    <MenuItemSlider
      title="Best Selling MenuItems"
      menuItems={bestSellingMenuItems}
      hideDetails
    />
  );
};

const AsyncTodaysDeals = async () => {
  "use cache";
  cacheLife("days");

  const todaysDeals = await getMenuItemsByTag({
    tag: "todays-deal",
  });

  return <MenuItemSlider title="Today's Deals" menuItems={todaysDeals} />;
};

/* ---------------- HOME CARDS ---------------- */
const AsyncNewArrivalsCards = async () => {
  "use cache";
  cacheLife("days");

  const [allCategories, allTags, newArrivals, featureds, bestSellers] =
    await Promise.all([
      getAllCategoriesForStore(),
      getAllTagsForStore(),
      getMenuItemsForCard({ tag: "new-arrival" }),
      getMenuItemsForCard({ tag: "featured" }),
      getMenuItemsForCard({ tag: "best-seller" }),
    ]);

  const categories = allCategories.slice(0, 4);
  const tags = allTags.slice(0, 4);

  const cards = [
    {
      title: "Categories to explore",
      link: { text: "See More", href: "/categories" },
      items: categories.map((category: any) => ({
        name: category.name,
        image: category.image || "/images/not-found.png",
        href: `/categories/${category.slug}`,
      })),
    },

    {
      title: "Browse by Tags",
      link: { text: "View All", href: "/tags" },
      items: tags.map((tag: any) => ({
        name: tag.name,
        image: tag.image || "/images/not-found.png",
        href: `/tags/${tag.slug}`,
      })),
    },
    {
      title: "Explore New Arrivals",
      items: newArrivals,
      link: { text: "View All", href: "/search?tag=new-arrival" },
    },
    {
      title: "Discover Best Sellers",
      items: bestSellers,
      link: { text: "View All", href: "/search?tag=best-seller" },
    },
    {
      title: "Featured Menu items",
      items: featureds,
      link: { text: "Shop Now", href: "/search?tag=featured" },
    },
  ];

  return <HomeCard cards={cards} />;
};

/* ---------------- BLOG ---------------- */
const AsyncBlogSlider = async () => {
  "use cache";
  cacheLife("days");

  const { blogs } = await getPublishedBlogs({ limit: 5 });

  return <BlogSlider title="Our Latest Stories" blogs={blogs} />;
};

/* ---------------- SKELETONS ---------------- */
const SkeletonCarousel = () => (
  <Skeleton className="aspect-16/8 md:aspect-16/5 w-full rounded-none" />
);

const SkeletonCard = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
    {[1, 2, 3, 4].map((i) => (
      <Skeleton key={i} className="h-100 w-full rounded-2xl" />
    ))}
  </div>
);

const SkeletonMenuItemSlider = () => (
  <Skeleton className="h-72 w-full rounded-2xl" />
);

const SkeletonBlogSlider = () => (
  <Skeleton className="h-64 w-full rounded-2xl" />
);

/* ---------------- PAGE ---------------- */
export default async function HomePage() {
  const { site } = await getSetting();

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.description,
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: {
        "@type": "ImageObject",
        url: `${site.url}${site.logo}`,
      },
    },
  };

  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />

      {/* HERO */}
      <Suspense fallback={<SkeletonCarousel />}>
        <AsyncHomeCarousel />
      </Suspense>

      <div className="max-w-7xl mx-auto py-6 md:py-12 space-y-8 md:space-y-12 px-2 md:px-4">
        {/* DISCOVERY CARDS */}
        <section>
          <Suspense fallback={<SkeletonCard />}>
            <AsyncNewArrivalsCards />
          </Suspense>
        </section>

        {/* DEALS */}
        <section>
          <Card className="w-full rounded-2xl border-none shadow-md overflow-hidden bg-card">
            <CardContent className="p-4">
              <Suspense fallback={<SkeletonMenuItemSlider />}>
                <AsyncTodaysDeals />
              </Suspense>
            </CardContent>
          </Card>
        </section>

        {/* BEST SELLERS */}
        <section>
          <Card className="w-full rounded-2xl border-none shadow-md overflow-hidden bg-card">
            <CardContent className="p-4">
              <Suspense fallback={<SkeletonMenuItemSlider />}>
                <AsyncBestSellingMenuItems />
              </Suspense>
            </CardContent>
          </Card>
        </section>

        {/* AFFILIATE (moved up for conversion) */}
        <section>
          <AffiliatePromo />
        </section>

        {/* COUPONS (moved up for conversion) */}
        <section>
          <CouponPromo />
        </section>

        {/* FEATURED CONTENT */}
        <section>
          <Suspense fallback={<SkeletonCarousel />}>
            <AboutCarousel />
          </Suspense>
        </section>

        {/* BLOG */}
        <section className="flex justify-center">
          <Suspense fallback={<SkeletonBlogSlider />}>
            <AsyncBlogSlider />
          </Suspense>
        </section>

        {/* BROWSING HISTORY (moved down) */}
        <section className="bg-muted/30 rounded-3xl p-4 md:p-8">
          <BrowsingHistoryList />
        </section>
      </div>
    </div>
  );
}
