import { cwd } from "process";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(cwd());

import data from "../data";
import { connectToDatabase } from "./index";
import User from "./models/user.model";
import MenuItem from "./models/menu.item.model";
import Category from "./models/category.model";
import Tag from "./models/tag.model";
import Coupon from "./models/coupon.model";
import Blog from "./models/blog.model";
import Setting from "./models/setting.model";
import WebPage from "./models/web-page.model";

const SOCIAL_ICON_MAP = {
  facebook: "/icons/facebook.svg",
  twitter: "/icons/x.svg",
  tiktok: "/icons/tiktok.svg",
  youtube: "/icons/youtube.svg",
  instagram: "/icons/instagram.svg",
  whatsapp: "/icons/whatsapp.svg",
  linkedin: "/icons/logo.png",
} as const;

const mapSettingForSeed = (setting: (typeof data.settings)[number]) => ({
  ...setting,
  socialMedia: Object.entries(setting.socialMedia).map(([name, url]) => ({
    name,
    url,
    image: SOCIAL_ICON_MAP[name as keyof typeof SOCIAL_ICON_MAP] || "/icons/logo.png",
    isPublished: true,
  })),
});

const main = async () => {
  try {
    await connectToDatabase(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Category.deleteMany({});
    await Tag.deleteMany({});
    await Coupon.deleteMany({});
    await Blog.deleteMany({});
    await Setting.deleteMany({});
    await WebPage.deleteMany({});
    console.log("Cleared existing data");

    // Seed Categories
    await Category.insertMany(data.categories);
    console.log(`Seeded ${data.categories.length} categories`);

    // Seed Tags
    await Tag.insertMany(data.tags);
    console.log(`Seeded ${data.tags.length} tags`);

    // Seed Coupons
    await Coupon.insertMany(data.coupons);
    console.log(`Seeded ${data.coupons.length} coupons`);

    // Seed Blogs
    await Blog.insertMany(data.blogs);
    console.log(`Seeded ${data.blogs.length} blogs`);

    // Seed Settings
    const normalizedSettings = data.settings.map(mapSettingForSeed);
    await Setting.insertMany(normalizedSettings);
    console.log(`Seeded ${normalizedSettings.length} settings`);

    // Seed WebPages
    await WebPage.insertMany(data.webPages);
    console.log("Seeded web pages");

    // Seed Users
    await User.insertMany(data.users);
    console.log("Seeded users");

    // Seed MenuItems
    await MenuItem.insertMany(data.menuItems);
    console.log("Seeded menuItems");

    console.log("Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();
