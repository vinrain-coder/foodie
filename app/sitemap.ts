import { MetadataRoute } from "next";
import { getSetting } from "@/lib/actions/setting.actions";
import { connectToDatabase } from "@/lib/db";
import MenuItem from "@/lib/db/models/menu.item.model";
import Blog from "@/lib/db/models/blog.model";
import Category from "@/lib/db/models/category.model";
import Tag from "@/lib/db/models/tag.model";
import WebPage from "@/lib/db/models/web-page.model";
import Restaurant from "@/lib/db/models/restaurant.model";
import { toAbsoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { site } = await getSetting();
  await connectToDatabase();
  const now = new Date();

  // Static public routes
  const staticRoutes = [
    "",
    "/shop",
    "/coupons",
    "/track",
    "/search",
    "/restaurants",
    "/support",
    "/affiliate",
    "/page",
    "/blogs",
    "/categories",
    "/tags",
  ].map((route) => ({
    url: toAbsoluteUrl(site.url, route),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.7,
  }));

  // Dynamic menuItem routes
  const visibleRestaurants = await Restaurant.find(
    { status: "approved", isApproved: true, isActive: true },
    "_id slug updatedAt",
  );
  const visibleRestaurantIds = visibleRestaurants.map((restaurant) => restaurant._id);

  const menuItems = await MenuItem.find(
    {
      isPublished: true,
      $or: [
        { restaurant: { $exists: false } },
        { restaurant: null },
        { restaurant: { $in: visibleRestaurantIds } },
      ],
    },
    "slug updatedAt",
  );
  const menuItemRoutes = menuItems.map((menuItem) => ({
    url: toAbsoluteUrl(site.url, `/menu-item/${menuItem.slug}`),
    lastModified: menuItem.updatedAt || now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const restaurantRoutes = visibleRestaurants.map((restaurant) => ({
    url: toAbsoluteUrl(site.url, `/restaurants/${restaurant.slug}`),
    lastModified: restaurant.updatedAt || now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic blog routes
  const blogs = await Blog.find({ isPublished: true }, "slug updatedAt");
  const blogRoutes = blogs.map((blog) => ({
    url: toAbsoluteUrl(site.url, `/blogs/${blog.slug}`),
    lastModified: blog.updatedAt || now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Dynamic category, brand, tag, and CMS routes
  const [categories, tags, webPages] = await Promise.all([
    Category.find({}, "slug updatedAt"),
    Tag.find({}, "slug updatedAt"),
    WebPage.find({ isPublished: true }, "slug updatedAt"),
  ]);

  const categoryRoutes = categories.map((c) => ({
    url: toAbsoluteUrl(site.url, `/categories/${c.slug}`),
    lastModified: c.updatedAt || now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const tagRoutes = tags.map((t) => ({
    url: toAbsoluteUrl(site.url, `/tags/${t.slug}`),
    lastModified: t.updatedAt || now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const webPageRoutes = webPages.map((p) => ({
    url: toAbsoluteUrl(site.url, `/page/${p.slug}`),
    lastModified: p.updatedAt || now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const routes = [
    ...staticRoutes,
    ...menuItemRoutes,
    ...restaurantRoutes,
    ...blogRoutes,
    ...categoryRoutes,
    ...tagRoutes,
    ...webPageRoutes,
  ];

  const dedupedRoutes = Array.from(
    new Map(routes.map((entry) => [entry.url, entry])).values(),
  );

  return dedupedRoutes;
}
