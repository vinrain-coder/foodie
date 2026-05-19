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
    await Setting.insertMany(data.settings);
    console.log("Seeded settings");

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
