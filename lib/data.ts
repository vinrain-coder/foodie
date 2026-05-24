import {
  Data,
  IMenuItemInput,
  IUserInput,
  ICategoryInput,
  ITagInput,
  ICouponInput,
  IBlogInput,
} from "@/types";
import { toSlug } from "./utils";
import bcrypt from "bcryptjs";
import { DiscountType } from "./db/models/coupon.model";

const categories: ICategoryInput[] = [
  {
    name: "Local Favorites",
    slug: "local-favorites",
    description: "Popular Kenyan meals from trusted partner restaurants.",
    isFeatured: true,
    image: "/images/banner1.jpg",
    seoTitle: "Order Local Favorite Meals Online",
    seoDescription:
      "Discover top local favorites from vetted restaurants with fast checkout and delivery updates.",
  },
  {
    name: "Grill & Fast Food",
    slug: "grill-fast-food",
    description: "Burgers, grilled chicken, fries, and other comfort picks.",
    isFeatured: true,
    image: "/images/banner2.jpg",
    seoTitle: "Best Grill and Fast Food Delivery",
    seoDescription:
      "Order burgers, grilled meals, and comfort food from top-rated partner restaurants.",
  },
  {
    name: "Healthy Bowls",
    slug: "healthy-bowls",
    description: "Balanced bowls, salads, and nutrition-focused dishes.",
    isFeatured: true,
    image: "/images/banner3.jpg",
    seoTitle: "Healthy Bowls and Salads Delivery",
    seoDescription:
      "Browse fresh bowls and healthy options from restaurants near you.",
  },
  {
    name: "Desserts & Drinks",
    slug: "desserts-drinks",
    description: "Sweet treats, smoothies, soft drinks, and cold beverages.",
    isFeatured: false,
    image: "/images/sneakers.jpg",
    seoTitle: "Desserts and Drinks Online",
    seoDescription:
      "Add desserts and drinks to your order from premium food vendors.",
  },
];

const tags: ITagInput[] = [
  {
    name: "New Arrival",
    slug: "new-arrival",
    description: "Freshly added dishes from partner restaurants.",
    image: "/images/banner1.jpg",
  },
  {
    name: "Best Seller",
    slug: "best-seller",
    description: "Top-performing meals customers order most.",
    image: "/images/banner2.jpg",
  },
  {
    name: "Featured",
    slug: "featured",
    description: "Curated menu picks highlighted by the platform.",
    image: "/images/banner3.jpg",
  },
  {
    name: "Today's Deal",
    slug: "todays-deal",
    description: "Limited-time discounted meals available today.",
    image: "/images/casual.jpg",
  },
];

const coupons: ICouponInput[] = [
  {
    code: "WELCOME10",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minPurchase: 50,
    isPublished: true,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isSponsored: true,
    usageLimitPerUser: 1,
    tier: "free",
    maxUsage: 100,
  },
  {
    code: "SAVE20",
    discountType: DiscountType.FIXED,
    discountValue: 20,
    minPurchase: 100,
    isPublished: true,
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    isSponsored: false,
    tier: "free",
    maxUsage: 100,
  },
];

const blogs: IBlogInput[] = [
  {
    title: "How Restaurant Dashboards Improve Delivery Reliability",
    slug: "restaurant-dashboards-delivery-reliability",
    content:
      "A practical breakdown of how order visibility, preparation workflows, and live status updates improve fulfillment quality.",
    image: "/images/banner1.jpg",
    category: "Operations",
    tags: ["restaurant", "operations", "delivery"],
    isPublished: true,
    publishedAt: new Date(),
    views: 180,
  },
  {
    title: "Using Promotions to Increase Repeat Orders",
    slug: "promotions-for-repeat-orders",
    content:
      "Learn how to run coupon and seasonal offer campaigns without hurting margins, while improving customer retention.",
    image: "/images/banner2.jpg",
    category: "Growth",
    tags: ["coupons", "retention", "marketing"],
    isPublished: true,
    publishedAt: new Date(),
    views: 260,
  },
];

const users: IUserInput[] = [
  {
    name: "Admin User",
    email: "admin@tumafood.com",
    password: bcrypt.hashSync("@Admin123", 10),
    role: "ADMIN",
    emailVerified: true,
    paymentMethod: "Stripe",
    subscription: "FREE",
    address: {
      fullName: "Admin Account",
      street: "123 Business Rd",
      city: "Nairobi",
      county: "Nairobi",
      postalCode: "00100",
      country: "Kenya",
      phone: "+254712345678",
    },
    subscriptionStatus: "inactive",
  },
  {
    name: "John Doe",
    email: "john@example.com",
    password: bcrypt.hashSync("user123", 10),
    role: "USER",
    emailVerified: true,
    paymentMethod: "Mpesa",
    subscription: "FREE",
    address: {
      fullName: "John Doe",
      street: "456 Resident Ave",
      city: "Mombasa",
      county: "Coast",
      postalCode: "80100",
      country: "Kenya",
      phone: "+254787654321",
    },
    subscriptionStatus: "inactive",
  },
];

const menuItems: IMenuItemInput[] = [
  {
    name: "Smoky Nyama Choma Platter",
    slug: toSlug("Smoky Nyama Choma Platter"),
    category: "Local Favorites",
    images: ["/images/banner1.jpg", "/images/banner2.jpg"],
    tags: ["best-seller", "featured"],
    isPublished: true,
    price: 18.0,
    countInStock: 60,
    description:
      "Char-grilled beef platter served with kachumbari and house chili sauce.",
    shortDescription: "A premium grilled local classic.",
    avgRating: 4.8,
    numReviews: 124,
    numSales: 320,
    ratingDistribution: [
      { rating: 1, count: 2 },
      { rating: 2, count: 3 },
      { rating: 3, count: 10 },
      { rating: 4, count: 25 },
      { rating: 5, count: 84 },
    ],
    reviews: [],
  },
  {
    name: "Chicken Burger Combo",
    slug: toSlug("Chicken Burger Combo"),
    category: "Grill & Fast Food",
    images: ["/images/casual.jpg", "/images/jeans.jpg"],
    tags: ["new-arrival", "todays-deal"],
    isPublished: true,
    price: 12.0,
    countInStock: 75,
    shortDescription: "Crispy chicken burger with fries and soft drink.",
    description:
      "Crispy chicken burger layered with fresh lettuce, fries, and a chilled drink.",
    avgRating: 4.7,
    numReviews: 89,
    numSales: 250,
    ratingDistribution: [
      { rating: 1, count: 0 },
      { rating: 2, count: 1 },
      { rating: 3, count: 5 },
      { rating: 4, count: 20 },
      { rating: 5, count: 63 },
    ],
    reviews: [],
  },
  {
    name: "Salmon Avocado Power Bowl",
    slug: toSlug("Salmon Avocado Power Bowl"),
    category: "Healthy Bowls",
    images: ["/images/banner3.jpg", "/images/formal.jpg"],
    tags: ["featured", "best-seller"],
    isPublished: true,
    price: 22.0,
    countInStock: 35,
    shortDescription: "Protein-rich salmon bowl with greens and grains.",
    description:
      "Fresh salmon with quinoa, avocado, leafy greens, and sesame dressing.",
    avgRating: 4.9,
    numReviews: 210,
    numSales: 420,
    ratingDistribution: [
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 2 },
      { rating: 4, count: 18 },
      { rating: 5, count: 190 },
    ],
    reviews: [],
  },
];

const reviews = [
  {
    rating: 5,
    title: "Fast and fresh",
    comment:
      "Order arrived hot and on time. The restaurant updates were very clear.",
  },
  {
    rating: 4,
    title: "Great platform experience",
    comment:
      "Easy checkout and useful offers. I'd like more restaurant choices in my area.",
  },
];

const data: Data = {
  users,
  menuItems,
  categories,
  tags,
  coupons,
  blogs,
  reviews,
  webPages: [
    {
      title: "About Us",
      slug: "about-us",
      content: `Welcome to TumaFood, a premium food delivery marketplace that connects customers with trusted restaurants.

Our platform is built to make ordering simple for customers and operations efficient for restaurant teams. Customers can discover meals quickly, place secure orders, and track fulfillment in real time. Restaurants can manage menus, receive incoming orders, and serve customers with better reliability.

TumaFood exists to bridge both sides of the experience so great food reaches people faster while restaurant partners grow sustainably.`,
      isPublished: true,
    },
    {
      title: "Contact Us",
      slug: "contact-us",
      content: `We're here to help. If you have questions, concerns, or feedback, reach out to our support team.

**Customer Support**
- **Email:** support@tumafood.com
- **Phone:** +254 700 000000
- **Live Chat:** Available on our website from 9 AM to 6 PM (Monday to Friday)

**Head Office**
- **Address:** 1234 Market Lane, Nairobi, Kenya

We look forward to assisting you.`,
      isPublished: true,
    },
    {
      title: "Help",
      slug: "help",
      content: `Welcome to our Help Center.

**Placing and Managing Orders**
Browse restaurants and menu items, add choices to cart, and complete checkout. You can track order status from your account.

**Delivery and Refunds**
Delivery timelines and fees vary by area and restaurant operations. If there is an issue with an order, contact support and we'll assist with the best resolution path.

**Account and Support**
Sign in to manage your profile, saved addresses, and payment preferences.`,
      isPublished: true,
    },
    {
      title: "Privacy Policy",
      slug: "privacy-policy",
      content: `We value your privacy and protect personal data using industry-standard safeguards.

We collect information such as contact details, address data, and payment metadata to process orders, improve service, and communicate relevant updates. We only share data with trusted providers required for service delivery.`,
      isPublished: true,
    },
    {
      title: "Conditions of Use",
      slug: "conditions-of-use",
      content: `By using TumaFood, you agree to our terms for ordering, account usage, and marketplace interactions.

We aim to keep all menu, price, and availability details accurate, but occasional updates or corrections may happen as restaurant partners adjust operations.`,
      isPublished: true,
    },
    {
      title: "Customer Service",
      slug: "customer-service",
      content: `Our customer service team helps with order updates, account questions, and platform support.

- **Email:** support@tumafood.com
- **Phone:** +254 700 000000
- **Live Chat:** Available during support hours`,
      isPublished: true,
    },
    {
      title: "Returns Policy",
      slug: "returns-policy",
      content: `Food orders are prepared on demand, so return eligibility depends on order status and issue type.

If an order arrives incorrect, delayed beyond expectations, or compromised in quality, contact support promptly for review and resolution.`,
      isPublished: true,
    },
  ],
  headerMenus: [
    {
      name: "New Arrivals",
      href: "/search?tag=new-arrival",
      subMenus: [
        {
          name: "Local Favorites",
          href: "/search?tag=new-arrival&category=Local%20Favorites",
        },
        {
          name: "Healthy Bowls",
          href: "/search?tag=new-arrival&category=Healthy%20Bowls",
        },
      ],
    },
    { name: "Best Sellers", href: "/search?tag=best-seller", subMenus: [] },
    { name: "Today's Deals", href: "/search?tag=todays-deal", subMenus: [] },
    {
      name: "Categories",
      href: "/categories",
      subMenus: [
        { name: "Grill & Fast Food", href: "/categories/grill-fast-food" },
        { name: "Desserts & Drinks", href: "/categories/desserts-drinks" },
      ],
    },
    { name: "Restaurants", href: "/restaurants", subMenus: [] },
    { name: "Blogs", href: "/blogs", subMenus: [] },
    { name: "Customer Service", href: "/page/customer-service", subMenus: [] },
  ],
  carousels: [
    {
      title: "Order from Premium Partner Restaurants",
      buttonCaption: "Explore Menus",
      image: "/images/banner1.jpg",
      url: "/restaurants",
      isPublished: true,
    },
    {
      title: "Fresh Meals, Faster Checkout",
      buttonCaption: "Start Ordering",
      image: "/images/banner2.jpg",
      url: "/search?tag=best-seller",
      isPublished: true,
    },
  ],
  settings: [
    {
      common: {
        freeShippingMinPrice: 5000,
        firstPurchaseDiscountRate: 20,
        coinsRewardRate: 4,
        taxRate: 0,
        premiumMembershipPrice: 500,
        isMaintenanceMode: false,
        defaultTheme: "light",
        defaultColor: "gold",
        pageSize: 12,
      },
      site: {
        name: "TumaFood",
        description:
          "Premium restaurant marketplace connecting customers and food vendors in Kenya",
        keywords:
          "food delivery, restaurants, online ordering, kenya, nairobi, marketplace",
        url: "https://tumafood.com",
        logo: "/icons/logo.png",
        slogan: "Order Better, Deliver Smarter",
        author: "TumaFood Team",
        copyright: "2024 TumaFood Inc.",
        email: "support@tumafood.com",
        address: "Nairobi, Kenya",
        phone: "+254 700 000000",
        businessHours: "Mon - Sat | 9:00 AM - 7:00 PM",
      },
      socialMedia: {
        facebook: "https://www.facebook.com/tumafood",
        twitter: "https://x.com/tumafood",
        tiktok: "https://www.tiktok.com/@tumafood",
        youtube: "https://www.youtube.com/@tumafood",
        instagram: "https://www.instagram.com/tumafood",
        whatsapp: "https://wa.me/254700000000",
        linkedin: "https://www.linkedin.com/company/tumafood",
      },
      notifications: {
        sms: {
          enabled: true,
          sandboxMode: true,
          username: "sandbox",
          senderId: "TUMAFOOD",
          adminRecipients: "+254712345678",
        },
      },
      carousels: [
        {
          title: "Trusted Restaurants, Better Experiences",
          buttonCaption: "See Restaurants",
          image: "/images/banner3.jpg",
          url: "/restaurants",
          isPublished: true,
        },
      ],
      headerMenus: [
        {
          name: "New Arrivals",
          href: "/search?tag=new-arrival",
          subMenus: [
            {
              name: "Local Favorites",
              href: "/search?tag=new-arrival&category=Local%20Favorites",
            },
            {
              name: "Healthy Bowls",
              href: "/search?tag=new-arrival&category=Healthy%20Bowls",
            },
          ],
        },
        {
          name: "Best Sellers",
          href: "/search?tag=best-seller",
          subMenus: [],
        },
        { name: "Today's Deals", href: "/search?tag=todays-deal", subMenus: [] },
        {
          name: "Categories",
          href: "/categories",
          subMenus: [
            { name: "Grill & Fast Food", href: "/categories/grill-fast-food" },
            { name: "Desserts & Drinks", href: "/categories/desserts-drinks" },
          ],
        },
        { name: "Restaurants", href: "/restaurants", subMenus: [] },
        { name: "Blogs", href: "/blogs", subMenus: [] },
        {
          name: "Customer Service",
          href: "/page/customer-service",
          subMenus: [],
        },
      ],
      availableLanguages: [{ name: "English", code: "en-US" }],
      defaultLanguage: "en-US",
      availableCurrencies: [
        { name: "Kenyan Shilling", code: "KES", symbol: "KSh", convertRate: 1 },
        { name: "US Dollar", code: "USD", symbol: "$", convertRate: 0.0078 },
      ],
      defaultCurrency: "KES",
      availablePaymentMethods: [
        { name: "Mpesa", commission: 0, isPublished: true },
        { name: "Stripe", commission: 0, isPublished: true },
        { name: "Cash On Delivery", commission: 0, isPublished: true },
      ],
      defaultPaymentMethod: "Mpesa",
      availableDeliveryDates: [
        {
          name: "Standard",
          daysToDeliver: 3,
          shippingPrice: 300,
          freeShippingMinPrice: 5000,
        },
        {
          name: "Express",
          daysToDeliver: 1,
          shippingPrice: 600,
          freeShippingMinPrice: 10000,
        },
      ],
      defaultDeliveryDate: "Standard",
      affiliate: {
        enabled: true,
        commissionRate: 10,
        defaultDiscountRate: 5,
        cookieExpiryDays: 30,
        minWithdrawalAmount: 1000,
      },
    },
  ],
};

export default data;
