import { z } from "zod";
import { formatNumberWithDecimal } from "./utils";
import { SUBSCRIPTION_TIERS, USER_ROLES } from "./constants";

// Common
const MongoId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid MongoDB ID" });

const Price = (field: string) =>
  z.coerce
    .number()
    .refine(
      (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(value)),
      `${field} must have exactly two decimal places (e.g., 49.99)`,
    );

export const ReviewInputSchema = z.object({
  menuItem: z.string().min(1, "Menu Item ID is required"),
  user: z.string().min(1, "User ID is required"), // ✅ FIX
  isVerifiedPurchase: z.boolean().default(false),
  title: z.string().min(1, "Title is required"),
  comment: z.string().min(1, "Comment is required"),
  image: z
    .string()
    .url("Review image must be a valid URL")
    .optional()
    .or(z.literal("")),
  images: z
    .array(z.string().url("Review image must be a valid URL"))
    .max(2, "You can upload up to 2 images")
    .optional()
    .default([]),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
});

const MenuItemInputBase = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  category: z.string().min(1, "Category is required"),
  images: z.array(z.string()).min(1, "Menu Item must have at least one image"),
  videoLink: z
    .string()
    .optional()
    .refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "Must be a valid URL",
    }),
  shortDescription: z
    .string()
    .min(1, "Short description is required")
    .max(200, "Short description must be at most 200 characters"),
  description: z.string().min(1, "Description is required"),
  isPublished: z.boolean(),
  price: Price("Price"),
  countInStock: z.coerce
    .number()
    .int()
    .nonnegative("Count in stock must be a non-negative number"),
  tags: z.array(z.string()).default([]),
  avgRating: z.coerce
    .number()
    .min(0, "Average rating must be at least 0")
    .max(5, "Average rating must be at most 5"),
  numReviews: z.coerce
    .number()
    .int()
    .nonnegative("Number of reviews must be a non-negative number"),
  ratingDistribution: z
    .array(z.object({ rating: z.number(), count: z.number() }))
    .max(5),
  reviews: z.array(ReviewInputSchema).default([]),
  numSales: z.coerce
    .number()
    .int()
    .nonnegative("Number of sales must be a non-negative number"),
});

export const MenuItemInputSchema = MenuItemInputBase;

export const MenuItemUpdateSchema = MenuItemInputBase.extend({
  _id: z.string(),
});

// Order Item
export const OrderItemSchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
  menuItem: z.string().min(1, "Menu Item is required"),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z
    .number()
    .int()
    .nonnegative("Quantity must be a non-negative number"),
  countInStock: z
    .number()
    .int()
    .nonnegative("Quantity must be a non-negative number"),
  image: z.string().min(1, "Image is required"),
  price: Price("Price"),
});
export const ShippingAddressSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1, "Full name is required"),
  street: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  province: z.string().min(1, "Province is required"),
  phone: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
});

export const AddressBookEntrySchema = ShippingAddressSchema.extend({
  id: z.string().min(1, "Address id is required"),
  label: z
    .string()
    .trim()
    .min(1, "Address label is required")
    .max(60, "Address label must be at most 60 characters"),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AddressBookInputSchema = ShippingAddressSchema.extend({
  label: z
    .string()
    .trim()
    .min(1, "Address label is required")
    .max(60, "Address label must be at most 60 characters"),
  saveAsDefault: z.boolean().optional().default(false),
});

// Order

const OrderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "return_requested",
  "delivery_exception",
]);

export const OrderInputSchema = z
  .object({
    user: MongoId.optional(),
    restaurant: MongoId.optional(),
    isGuest: z.boolean().default(false),
    userEmail: z.string().email().optional(),
    userName: z.string().optional(),
    accessToken: z.string().optional(),
    items: z
      .array(OrderItemSchema)
      .min(1, "Order must contain at least one item"),
    shippingAddress: ShippingAddressSchema,
    note: z
      .string()
      .trim()
      .max(500, "Note must be at most 500 characters")
      .optional(),
    paymentMethod: z.string().min(1, "Payment method is required"),
    trackingNumber: z.string().min(8).optional(),
    status: OrderStatusSchema.default("pending"),
    trackingHistory: z
      .array(
        z.object({
          status: OrderStatusSchema,
          message: z.string().min(1),
          location: z.string().optional(),
          source: z
            .enum(["system", "admin", "courier", "customer"])
            .default("system"),
          metadata: z.record(z.string(), z.any()).optional(),
          createdAt: z.date().optional(),
        }),
      )
      .default([]),
    shipment: z
      .object({
        courierName: z.string().optional(),
        courierTrackingReference: z.string().optional(),
        estimatedDeliveryDate: z.date().optional(),
        dispatchedAt: z.date().optional(),
        deliveredAt: z.date().optional(),
      })
      .optional(),
    paymentType: z.string().optional(),
    paymentStatus: z.string().optional(),
    amountPaid: z.number().nonnegative().optional(),
    remainingAmount: z.number().optional(),
    bnplDueDate: z.date().optional(),
    financingStatus: z
      .enum(["active", "overdue", "completed", "suspended", "defaulted"])
      .optional(),
    financingPlan: z.string().optional(),
    minimumPayment: z.number().optional(),
    lastPaymentAt: z.date().optional(),
    nextReminderAt: z.date().optional(),
    lockedForNonPayment: z.boolean().optional(),
    gracePeriodDays: z.number().optional(),
    missedPaymentCount: z.number().optional(),
    repaymentProgress: z.number().optional(),
    totalRepayments: z.number().optional(),
    overdueDays: z.number().optional(),
    paymentResult: z
      .object({
        id: z.string(),
        status: z.string(),
        email_address: z.string(),
        pricePaid: z.string(),
        paymentMethod: z.string().optional(),
        paymentReference: z.string().optional(),
        gateway: z.string().optional(),
        currency: z.string().optional(),
        paidAtGateway: z.date().optional(),
        channel: z.string().optional(),
        authorization: z
          .object({
            card_type: z.string().optional(),
            bank: z.string().optional(),
            brand: z.string().optional(),
            last4: z.string().optional(),
            exp_month: z.string().optional(),
            exp_year: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    itemsPrice: Price("Items price"),
    shippingPrice: Price("Shipping price"),
    taxPrice: Price("Tax price"),
    totalPrice: Price("Total price"),
    coinsEarned: z.number().nonnegative().finite().default(0),
    coinsRedeemed: z.number().nonnegative().finite().default(0),
    walletAmountRedeemed: z.number().nonnegative().finite().default(0),
    expectedDeliveryDate: z
      .date()
      .refine(
        (value) => value > new Date(),
        "Expected delivery date must be in the future",
      ),
    isDelivered: z.boolean().default(false),
    deliveredAt: z.date().optional(),
    isPaid: z.boolean().default(false),
    paidAt: z.date().optional(),
    coupon: z
      .object({
        _id: MongoId.optional(),
        code: z.string(),
        discountType: z.enum(["percentage", "fixed"]),
        discountAmount: Price("Discount amount"),
        isAffiliate: z.boolean().optional(),
        isFirstPurchase: z.boolean().optional(),
      })
      .optional(),
    affiliate: MongoId.optional(),
    affiliateCode: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.isGuest ||
      (!!data.userEmail &&
        z.string().email().safeParse(data.userEmail).success),
    {
      message: "Email is required and must be valid for guest checkout",
      path: ["userEmail"],
    },
  );
// Cart

export const CartSchema = z.object({
  items: z
    .array(OrderItemSchema)
    .min(1, "Order must contain at least one item"),
  itemsPrice: z.number(),
  taxPrice: z.optional(z.number()),
  shippingPrice: z.optional(z.number()),
  discount: z.number().default(0),
  note: z.optional(z.string()),
  totalPrice: z.number(),
  paymentMethod: z.optional(z.string()),
  shippingAddress: z.optional(ShippingAddressSchema),
  deliveryDateIndex: z.optional(z.number()),
  selectedCounty: z.optional(z.string()),
  selectedDeliveryPlace: z.optional(z.string()),
  expectedDeliveryDate: z.optional(z.date()),
});

// USER
const UserName = z
  .string()
  .min(2, { message: "Username must be at least 2 characters" })
  .max(50, { message: "Username must be at most 30 characters" });
const Email = z.string().min(1, "Email is required").email("Email is invalid");
const Password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const UserUpdateSchema = z.object({
  _id: MongoId,
  name: UserName,
  email: Email,
  role: z.enum(USER_ROLES),
  subscription: z.enum(SUBSCRIPTION_TIERS).optional(),
  subscriptionStatus: z.enum(["active", "inactive", "trial"]).optional(),
  subscriptionExpiresAt: z.date().optional().nullable(),
});

export const UserInputSchema = z.object({
  name: UserName,
  email: Email,
  image: z.string().optional(),
  emailVerified: z.boolean(),
  role: z.enum(USER_ROLES),
  password: Password,
  subscription: z.enum(SUBSCRIPTION_TIERS).default("FREE"),
  subscriptionStatus: z
    .enum(["active", "inactive", "trial"])
    .default("inactive"),
  subscriptionExpiresAt: z.date().optional(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  address: z.object({
    fullName: z.string().min(1, "Full name is required"),
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
    phone: z.string().min(1, "Phone number is required"),
  }),
});

export const UserSignInSchema = z.object({
  email: Email,
  password: Password,
});
export const UserSignUpSchema = UserSignInSchema.extend({
  name: UserName,
  role: z.enum(USER_ROLES).default("USER"),
  confirmPassword: Password,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export const UserNameSchema = z.object({
  name: UserName,
});

// WEBPAGE
export const WebPageInputSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  image: z.string().url().optional().or(z.literal("")),
  excerpt: z.string().max(160).optional(),
  content: z.string().min(1, "Content is required"),
  isPublished: z.boolean(),
});

export const WebPageUpdateSchema = WebPageInputSchema.extend({
  _id: z.string(),
});

// Setting
export const SiteLanguageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
});
export const CarouselSchema = z.object({
  title: z.string().min(1, "title is required"),
  url: z.string().min(1, "url is required"),
  image: z.string().min(1, "image is required"),
  buttonCaption: z.string().min(1, "buttonCaption is required"),
  isPublished: z.boolean().default(false),
});

export const SiteCurrencySchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  convertRate: z.coerce.number().min(0, "Convert rate must be at least 0"),
  symbol: z.string().min(1, "Symbol is required"),
});

export const PaymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  commission: z.coerce.number().min(0, "Commission must be at least 0"),
  isPublished: z.boolean().default(true),
});

export const DeliveryDateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  daysToDeliver: z.coerce.number().min(0, "Days to deliver must be at least 0"),
  shippingPrice: z.coerce.number().min(0, "Shipping price must be at least 0"),
  freeShippingMinPrice: z.coerce
    .number()
    .min(0, "Free shipping min amount must be at least 0"),
});

export const DeliveryLocationSchema = z.object({
  name: z.string().trim().min(1, "Delivery place name is required"),
  rate: z.coerce.number().min(0, "Delivery place rate must be at least 0"),
});

export const DeliveryCountySchema = z.object({
  county: z.string().trim().min(1, "County is required"),
  places: z
    .array(DeliveryLocationSchema)
    .min(1, "At least one delivery place is required"),
});

export const HeaderSubMenuSchema = z.object({
  name: z.string().trim().min(1, "Sub-menu name is required"),
  href: z.string().trim().min(1, "Sub-menu URL is required"),
});

export const HeaderMenuSchema = z.object({
  name: z.string().trim().min(1, "Menu name is required"),
  href: z.string().trim().min(1, "Menu URL is required"),
  subMenus: z.array(HeaderSubMenuSchema).default([]),
});

const SmsNotificationSchema = z.object({
  enabled: z.boolean().default(true),
  sandboxMode: z.boolean().default(true),
  username: z.string().min(1, "Africa's Talking username is required"),
  senderId: z.string().default(""),
  adminRecipients: z.string().default(""),
});
export const SettingInputSchema = z.object({
  // PROMPT: create fields
  // codeium, based on the mongoose schema for settings
  common: z.object({
    pageSize: z.coerce
      .number()
      .min(1, "Page size must be at least 1")
      .default(12),
    isMaintenanceMode: z.boolean().default(false),
    freeShippingMinPrice: z.coerce
      .number()
      .min(0, "Free shipping min price must be at least 0")
      .default(5000),
    firstPurchaseDiscountRate: z.coerce
      .number()
      .min(0, "First purchase discount rate must be at least 0")
      .max(100, "First purchase discount rate cannot exceed 100")
      .default(20),
    coinsRewardRate: z.coerce
      .number()
      .min(0, "Coins reward rate must be at least 0")
      .default(4),
    taxRate: z.coerce.number().min(0, "Tax rate must be at least 0").default(0),
    premiumMembershipPrice: z.coerce
      .number()
      .min(0, "Premium membership price must be at least 0")
      .default(500),
    defaultTheme: z
      .string()
      .min(1, "Default theme is required")
      .default("light"),
    defaultColor: z
      .string()
      .min(1, "Default color is required")
      .default("gold"),
  }),
  socialMedia: z.object({
    facebook: z.string().min(1, "Facebook URL is required"),
    twitter: z.string().min(1, "Twitter URL is required"),
    tiktok: z.string().min(1, "TikTok URL is required"),
    instagram: z.string().min(1, "Instagram URL is required"),
    youtube: z.string().min(1, "YouTube URL is required"),
    whatsapp: z.string().min(1, "WhatsApp URL is required"),
    linkedin: z.string().min(1, "LinkedIn URL is required"),
  }),
  site: z.object({
    name: z.string().min(1, "Name is required"),
    logo: z.string().min(1, "logo is required"),
    slogan: z.string().min(1, "Slogan is required"),
    description: z.string().min(1, "Description is required"),
    keywords: z.string().min(1, "Keywords is required"),
    url: z.string().min(1, "Url is required"),
    email: z.string().min(1, "Email is required"),
    phone: z.string().min(1, "Phone is required"),
    author: z.string().min(1, "Author is required"),
    copyright: z.string().min(1, "Copyright is required"),
    address: z.string().min(1, "Address is required"),
    businessHours: z.string().min(1, "Business hours is required"),
  }),
  notifications: z.object({
    sms: SmsNotificationSchema,
  }),
  availableLanguages: z
    .array(SiteLanguageSchema)
    .min(1, "At least one language is required"),
  defaultLanguage: z.string().min(1, "Language is required"),
  carousels: z
    .array(CarouselSchema)
    .min(1, "At least one carousel is required"),
  headerMenus: z.array(HeaderMenuSchema).default([]),
  availableCurrencies: z
    .array(SiteCurrencySchema)
    .min(1, "At least one currency is required"),
  defaultCurrency: z.string().min(1, "Currency is required"),
  availablePaymentMethods: z
    .array(PaymentMethodSchema)
    .min(1, "At least one payment method is required"),
  defaultPaymentMethod: z.string().min(1, "Payment method is required"),
  availableDeliveryDates: z
    .array(DeliveryDateSchema)
    .min(1, "At least one delivery date is required"),
  defaultDeliveryDate: z.string().min(1, "Delivery date is required"),
  affiliate: z.object({
    enabled: z.boolean().default(false),
    commissionRate: z.coerce.number().min(0).default(10),
    defaultDiscountRate: z.coerce.number().min(0).default(5),
    cookieExpiryDays: z.coerce.number().min(1).default(30),
    minWithdrawalAmount: z.coerce.number().min(0).default(1000),
  }),
});

// Blog Validation
export const BlogInputSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  image: z.string().url().optional().or(z.literal("")),
  content: z.string().min(10, "Content must be at least 10 characters"),
  category: z.string().min(3, "Category is required"),
  views: z.number(),
  tags: z.array(z.string()),
  isPublished: z.boolean(),
  publishedAt: z.date().optional(),
});

export const BlogUpdateSchema = BlogInputSchema.extend({
  _id: MongoId,
});

export const BlogLikeInputSchema = z
  .object({
    blogId: MongoId,
    userId: z.string().optional(),
    guestId: z.string().optional(),
  })
  .refine((value) => Boolean(value.userId || value.guestId), {
    message: "A user or guest identifier is required",
  });

export const BlogCommentInputSchema = z.object({
  blogId: MongoId,
  parentCommentId: z.string().optional(),
  content: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(2000, "Comment is too long"),
});

export const NewsletterSubscriptionSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((value) => value.trim().toLowerCase()),
  source: z.enum(["footer", "checkout", "api", "manual"]).default("footer"),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
  botField: z.string().optional(),
});

// Stock subscription
export const StockSubscriptionSchema = z.object({
  menuItem: MongoId,
  email: z.string().email("Invalid email address"),
  subscribedAt: z.date().default(() => new Date()),
  isNotified: z.boolean().default(false),
  notifiedAt: z.date().optional(),
});

// password schema
export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  .regex(/[0-9]/, {
    message: "Password must contain at least one number",
  });

// Category Schema
export const CategoryBase = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and can contain hyphens only",
    }),
  isFeatured: z.boolean().default(false),
  description: z.string().max(500).optional(),
  image: z.string().url().optional().or(z.literal("")),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.array(z.string()).optional(),
});

export const CategoryInputSchema = CategoryBase;

export const CategoryUpdateSchema = CategoryBase.partial().extend({
  _id: z.string().min(1, "Menu Item ID is required"),
});

// brand schema
export const BrandBase = z.object({
  name: z
    .string()
    .min(1, "Brand name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and can contain hyphens only",
    }),
  isFeatured: z.boolean().default(false),
  description: z.string().max(500).optional(),
  image: z.string().url().optional().or(z.literal("")),
  logo: z.string().url().optional().or(z.literal("")),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.array(z.string()).optional(),
});

export const BrandInputSchema = BrandBase;

export const BrandUpdateSchema = BrandBase.partial().extend({
  _id: z.string().min(1, "Brand ID is required"),
});

// Tag
export const TagBase = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and can contain hyphens only",
    }),
  image: z.string().url().optional().or(z.literal("")),
  description: z.string().max(500).optional(),
});

export const TagInputSchema = TagBase;

export const TagUpdateSchema = TagBase.partial().extend({
  _id: z.string().min(1, "Tag ID is required"),
});

// Coupon input schema
export const CouponInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Coupon code must be at least 3 characters")
    .max(20, "Coupon code must be at most 20 characters")
    .toUpperCase(),
  discountType: z.enum(["percentage", "fixed"] as const),
  discountValue: Price("Discount value"),
  minPurchase: Price("Minimum purchase").optional(),

  expiryDate: z
    .date()
    .optional()
    .refine(
      (value) => !value || value > new Date(),
      "Expiry date must be in the future",
    ),
  maxUsage: z
    .number()
    .int()
    .positive("Max usage must be a positive integer")
    .optional(),
  tier: z.enum(["free", "premium"]).default("free"),
  usageLimitPerUser: z
    .number()
    .int()
    .positive("Usage limit per user must be a positive integer")
    .optional(),
  isSponsored: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

// Coupon update schema (includes `_id`)
export const CouponUpdateSchema = CouponInputSchema.extend({
  _id: MongoId,
});

// Affiliate
export const AffiliateInputSchema = z
  .object({
    affiliateCode: z
      .string()
      .min(3, "Affiliate code must be at least 3 characters")
      .max(20, "Affiliate code must be at most 20 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Only letters, numbers, hyphens and underscores are allowed",
      ),
    commissionRate: z.coerce.number().min(0).optional(),
    discountRate: z.coerce.number().min(0).optional(),
    paymentDetails: z.object({
      bankName: z.string().optional(),
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      payPalEmail: z.string().email().optional().or(z.literal("")),
      mPesaNumber: z.string().optional(),
    }),
  })
  .refine(
    (data) => {
      const { bankName, accountNumber, payPalEmail, mPesaNumber } =
        data.paymentDetails;
      return (bankName && accountNumber) || payPalEmail || mPesaNumber;
    },
    {
      message:
        "Please provide at least one payment method (M-Pesa, PayPal, or Bank Details)",
      path: ["paymentDetails"],
    },
  );

const PayoutInputSchema = z
  .object({
    amount: Price("Payout amount"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    paymentDetails: z.object({
      recipient: z.string().optional(),
    }),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === "Wallet") return true;
      return !!data.paymentDetails.recipient?.trim();
    },
    {
      message: "Recipient details are required",
      path: ["paymentDetails", "recipient"],
    },
  );

export const AffiliatePayoutInputSchema = PayoutInputSchema;
export const WalletPayoutInputSchema = PayoutInputSchema;

export const RestaurantApplicationInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Restaurant name must be at least 2 characters")
    .max(120, "Restaurant name must be at most 120 characters"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(80, "Slug must be at most 80 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and can contain hyphens only",
    }),
  logo: z.string().url("Logo must be a valid URL").optional().or(z.literal("")),
  coverImage: z
    .string()
    .url("Cover image must be a valid URL")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long")
    .regex(/^[+0-9()\s-]+$/, "Phone number contains invalid characters"),
  whatsapp: z
    .string()
    .trim()
    .min(7, "WhatsApp number is too short")
    .max(20, "WhatsApp number is too long")
    .regex(/^[+0-9()\s-]+$/, "WhatsApp number contains invalid characters"),
  location: z
    .string()
    .trim()
    .min(5, "Location is required")
    .max(300, "Location must be at most 300 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters"),
  openingHours: z
    .string()
    .trim()
    .min(5, "Opening hours are required")
    .max(500, "Opening hours must be at most 500 characters"),
  deliveryFee: Price("Delivery fee"),
  minimumOrderAmount: Price("Minimum order amount"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  cuisineTypes: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  acceptsDelivery: z.boolean().default(true),
  acceptsPickup: z.boolean().default(false),
  averagePrepTimeMinutes: z.coerce
    .number()
    .int("Average prep time must be a whole number")
    .min(5, "Average prep time must be at least 5 minutes")
    .max(300, "Average prep time must be at most 300 minutes")
    .default(30),
});

const AdminAdjustmentBaseSchema = z.object({
  userId: MongoId,
  amount: z.coerce
    .number()
    .finite("Amount must be a valid number")
    .refine((value) => value !== 0, "Amount must be a non-zero number"),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(280, "Reason must be at most 280 characters"),
});

export const AdminCoinAdjustmentInputSchema = AdminAdjustmentBaseSchema;
export const AdminWalletAdjustmentInputSchema = AdminAdjustmentBaseSchema;

export const WalletPayoutStatusUpdateSchema = z
  .object({
    id: MongoId,
    status: z.enum(["paid", "rejected"]),
    adminNote: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "rejected" && !data.adminNote?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["adminNote"],
        message: "A rejection reason is mandatory for rejection",
      });
      return;
    }

    if (data.adminNote && data.adminNote.length > 2000) {
      ctx.addIssue({
        code: "custom",
        path: ["adminNote"],
        message: "Admin note must be at most 2000 characters",
      });
    }
  });

export const DeliveryLocationInputSchema = z.object({
  county: z.string().trim().min(1, "County is required"),
  city: z.string().trim().min(1, "City is required"),
  rate: Price("Rate"),
});

export const DeliveryLocationUpdateSchema = DeliveryLocationInputSchema.extend({
  _id: MongoId,
});

export const SupportTicketInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: Email.transform((val) => val.trim()),
  type: z.enum(["complaint", "query", "recommendation"]),
  subject: z.string().trim().min(5, "Subject must be at least 5 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
});

// BNPL Payment Schema
export const BNPLPaymentInputSchema = z.object({
  order: MongoId,
  user: MongoId,
  amount: Price("Amount"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  reference: z.string().optional(),
  status: z
    .enum(["pending", "success", "failed", "cancelled", "reversed"])
    .default("pending"),
  type: z
    .enum(["repayment", "adjustment", "waiver", "refund"])
    .default("repayment"),
  notes: z.string().optional(),
  processedBy: z.string().optional(),
  source: z.enum(["paystack", "wallet", "manual", "system"]),
  paymentResult: z.record(z.string(), z.any()).optional(),
});
