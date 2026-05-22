import { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { cacheLife } from "next/cache";
import { ArrowRight, Building2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { HomeCarousel } from "@/components/shared/home/home-carousel";
import { AboutCarousel } from "@/components/shared/home/about-carousel";
import BlogSlider from "@/components/shared/blog/blog-slider";
import BrowsingHistoryList from "@/components/shared/browsing-history-list";
import { HomeCard } from "@/components/shared/home/home-card";
import MenuItemSlider from "@/components/shared/menuItem/menu-item-slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublishedBlogs } from "@/lib/actions/blog.actions";
import {
  getMenuItemsByTag,
  getMenuItemsForCard,
} from "@/lib/actions/menu.item.actions";
import { getSetting } from "@/lib/actions/setting.actions";
import { getAllCategoriesForStore } from "@/lib/actions/category.actions";
import { getAllTagsForStore } from "@/lib/actions/tag.actions";
import AffiliatePromo from "@/components/shared/home/affiliate-promo";
import CouponPromo from "@/components/shared/home/coupon-promo";
import RiderPromo from "@/components/shared/home/rider-promo";
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
      title="Trending Across Partner Restaurants"
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

  return <MenuItemSlider title="Today's Limited-Time Offers" menuItems={todaysDeals} />;
};

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
      title: "Cuisine Collections",
      link: { text: "Explore all cuisines", href: "/categories" },
      items: categories.map((category: any) => ({
        name: category.name,
        image: category.image || "/images/not-found.png",
        href: `/categories/${category.slug}`,
      })),
    },
    {
      title: "Order By Preference",
      link: { text: "Browse all tags", href: "/tags" },
      items: tags.map((tag: any) => ({
        name: tag.name,
        image: tag.image || "/images/not-found.png",
        href: `/tags/${tag.slug}`,
      })),
    },
    {
      title: "Freshly Added Dishes",
      items: newArrivals,
      link: { text: "See all new dishes", href: "/search?tag=new-arrival" },
    },
    {
      title: "Top Rated Right Now",
      items: bestSellers,
      link: { text: "See top picks", href: "/search?tag=best-seller" },
    },
    {
      title: "Chef Spotlight Picks",
      items: featureds,
      link: { text: "Open spotlight", href: "/search?tag=featured" },
    },
  ];

  return <HomeCard cards={cards} />;
};

const AsyncBlogSlider = async () => {
  "use cache";
  cacheLife("days");

  const { blogs } = await getPublishedBlogs({ limit: 5 });

  return <BlogSlider title="Operations & Growth Insights" blogs={blogs} />;
};

const SkeletonCarousel = () => (
  <Skeleton className="aspect-16/8 w-full rounded-3xl" />
);

const SkeletonCard = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
    {[1, 2, 3, 4].map((i) => (
      <Skeleton key={i} className="h-100 w-full rounded-3xl" />
    ))}
  </div>
);

const SkeletonMenuItemSlider = () => (
  <Skeleton className="h-72 w-full rounded-3xl" />
);

const SkeletonBlogSlider = () => (
  <Skeleton className="h-64 w-full rounded-3xl" />
);

function SectionHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 space-y-3 md:mb-8">
      <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {label}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-4xl">
        {title}
      </h2>
      <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
        {description}
      </p>
    </div>
  );
}

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
    <div className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(245,158,11,.14),transparent_36%),radial-gradient(circle_at_92%_10%,rgba(20,184,166,.12),transparent_30%),radial-gradient(circle_at_50%_96%,rgba(15,23,42,.08),transparent_30%)]" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />

      <div className="relative mx-auto max-w-7xl px-3 pb-12 pt-8 md:px-6 md:pt-12">
        <section className="mb-8 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-lg shadow-black/5 backdrop-blur md:mb-10 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Premium Food Delivery SaaS
              </p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
                Seamless ordering for customers, powerful operations for partner
                restaurants.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                {site.name} connects diners to quality restaurants through a
                fast ordering experience while giving restaurants the tools to
                accept, manage, and fulfill each order confidently.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-11 rounded-xl px-6">
                  <Link href="/restaurants">
                    Order From Restaurants
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-xl px-6"
                >
                  <Link href="/restaurant/register">
                    Become a Partner Restaurant
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  icon: Users,
                  title: "Customer-first UX",
                  text: "Fast menu discovery, smooth checkout, and transparent order flow.",
                },
                {
                  icon: Building2,
                  title: "Restaurant control",
                  text: "Partner dashboards for menu, pricing, order handling, and growth.",
                },
                {
                  icon: ShieldCheck,
                  title: "Production-ready trust",
                  text: "Reliable performance, clear communication, and secure operations.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border/70 bg-background/90 p-4"
                >
                  <item.icon className="mb-2 h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-border/60 shadow-xl shadow-black/10">
          <Suspense fallback={<SkeletonCarousel />}>
            <AsyncHomeCarousel />
          </Suspense>
        </section>

        <div className="mt-10 space-y-12 md:mt-14 md:space-y-16">
          <section>
            <SectionHeader
              label="Discovery"
              title="Find the right meal in seconds"
              description="Browse by cuisine, dietary preference, trends, and featured restaurant selections curated for high conversion and repeat orders."
            />
            <Suspense fallback={<SkeletonCard />}>
              <AsyncNewArrivalsCards />
            </Suspense>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-3xl border-border/60 bg-card/95 shadow-lg shadow-black/5">
              <CardContent className="p-5 md:p-6">
                <Suspense fallback={<SkeletonMenuItemSlider />}>
                  <AsyncTodaysDeals />
                </Suspense>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-border/60 bg-card/95 shadow-lg shadow-black/5">
              <CardContent className="p-5 md:p-6">
                <Suspense fallback={<SkeletonMenuItemSlider />}>
                  <AsyncBestSellingMenuItems />
                </Suspense>
              </CardContent>
            </Card>
          </section>

          <section>
            <Suspense fallback={<SkeletonCarousel />}>
              <AboutCarousel />
            </Suspense>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <AffiliatePromo />
            <CouponPromo />
            <RiderPromo />
          </section>

          <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-lg shadow-black/5 md:p-7">
            <Suspense fallback={<SkeletonBlogSlider />}>
              <AsyncBlogSlider />
            </Suspense>
          </section>

          <section className="rounded-3xl border border-border/60 bg-muted/40 p-4 md:p-8">
            <SectionHeader
              label="Personalization"
              title="Continue where you left off"
              description="Quickly return to meals and restaurants you recently explored."
            />
            <BrowsingHistoryList />
          </section>
        </div>
      </div>
    </div>
  );
}
