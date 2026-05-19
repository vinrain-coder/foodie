import {
  OrderTrackingStatus,
  generateTrackingNumber,
} from "@/lib/order-tracking";
import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface ICouponInfo {
  _id?: Types.ObjectId;
  code: string;
  discountType: "percentage" | "fixed";
  discountAmount: number;
  isAffiliate?: boolean;
  isFirstPurchase?: boolean;
}

export interface IOrderTrackingHistoryEvent {
  status: OrderTrackingStatus;
  message: string;
  location?: string;
  source: "system" | "admin" | "courier" | "customer";
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IOrderShipment {
  courierName?: string;
  courierTrackingReference?: string;
  estimatedDeliveryDate?: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  user?: Types.ObjectId | { _id?: string; email?: string; name?: string };
  isGuest: boolean;
  userEmail?: string;
  userName?: string;
  accessToken?: string;
  items: Array<{
    menuItem: Types.ObjectId | string;
    clientId: string;
    name: string;
    slug: string;
    image: string;
    category: string;
    price: number;
    countInStock: number;
    quantity: number;
  }>;
  shippingAddress: {
    email?: string;
    fullName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    province: string;
    phone: string;
  };
  note?: string;
  expectedDeliveryDate: Date;
  paymentMethod: string;
  paymentResult?: Record<string, unknown>;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
  coinsEarned: number;
  coinsRedeemed: number;
  walletAmountRedeemed: number;
  coinsCredited: boolean;
  isPaid: boolean;
  paidAt?: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  coupon?: ICouponInfo;
  affiliate?: Types.ObjectId | string;
  affiliateCode?: string;
  paymentType: "full" | "bnpl";
  paymentStatus: "pending" | "partial" | "paid" | "overdue" | "cancelled";
  amountPaid: number;
  remainingAmount: number;
  bnplDueDate?: Date;
  financingStatus?: "active" | "overdue" | "completed" | "suspended" | "defaulted" | "cancelled";
  financingPlan?: string;
  minimumPayment?: number;
  lastPaymentAt?: Date;
  nextReminderAt?: Date;
  lockedForNonPayment?: boolean;
  gracePeriodDays?: number;
  missedPaymentCount?: number;
  repaymentProgress?: number;
  totalRepayments?: number;
  overdueDays?: number;
  status: OrderTrackingStatus;
  trackingNumber: string;
  shipment?: IOrderShipment;
  trackingHistory: IOrderTrackingHistoryEvent[];
  isExchangeInitiated?: boolean;
  stockAdjusted?: boolean;
  stockReverted?: boolean;
  couponUsageIncremented?: boolean;
  affiliateUsageIncremented?: boolean;
  couponUsageReverted?: boolean;
  refundedToCoins?: boolean;
  refundedToWallet?: boolean;
}

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    isGuest: { type: Boolean, default: false },
    userEmail: { type: String },
    userName: { type: String },
    accessToken: { type: String, select: false },
    trackingNumber: {
      type: String,
      default: generateTrackingNumber,
    },
    status: {
      type: String,
      enum: [
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
      ],
      default: "pending",
      index: true,
    },
    trackingHistory: [
      {
        status: {
          type: String,
          required: true,
          enum: [
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
          ],
        },
        message: { type: String, required: true },
        location: { type: String },
        source: {
          type: String,
          enum: ["system", "admin", "courier", "customer"],
          default: "system",
        },
        metadata: { type: Schema.Types.Mixed },
        createdAt: { type: Date, required: true, default: Date.now },
      },
    ],
    shipment: {
      courierName: { type: String },
      courierTrackingReference: { type: String },
      estimatedDeliveryDate: { type: Date },
      dispatchedAt: { type: Date },
      deliveredAt: { type: Date },
    },
    items: [
      {
        menuItem: {
          type: Schema.Types.ObjectId,
          ref: "MenuItem",
          required: true,
        },
        clientId: { type: String, required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        image: { type: String, required: true },
        category: { type: String, required: true },
        price: { type: Number, required: true },
        countInStock: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    shippingAddress: {
      email: { type: String },
      fullName: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      province: { type: String, required: true },
      phone: { type: String, required: true },
    },
    note: { type: String },
    expectedDeliveryDate: { type: Date, required: true },
    paymentMethod: { type: String, required: true },
    paymentResult: {
      id: String,
      status: String,
      email_address: String,
      pricePaid: String,
      paymentMethod: String,
      paymentReference: String,
      gateway: String,
      currency: String,
      paidAtGateway: Date,
      channel: String,
      authorization: {
        card_type: String,
        bank: String,
        brand: String,
        last4: String,
        exp_month: String,
        exp_year: String,
      },
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    taxPrice: { type: Number, required: true },
    coupon: {
      _id: { type: Schema.Types.ObjectId, ref: "Coupon" },
      code: { type: String },
      discountType: { type: String, enum: ["percentage", "fixed"] },
      discountAmount: { type: Number },
      isAffiliate: { type: Boolean },
      isFirstPurchase: { type: Boolean },
    },
    affiliate: {
      type: Schema.Types.ObjectId,
      ref: "Affiliate",
    },
    affiliateCode: {
      type: String,
    },
    totalPrice: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ["full", "bnpl"],
      default: "full",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue", "cancelled"],
      default: "pending",
    },
    amountPaid: { type: Number, default: 0 },
    remainingAmount: { type: Number },
    bnplDueDate: { type: Date },
    financingStatus: {
      type: String,
      enum: ["active", "overdue", "completed", "suspended", "defaulted", "cancelled"],
      index: true,
    },
    financingPlan: { type: String },
    minimumPayment: { type: Number, default: 0 },
    lastPaymentAt: { type: Date },
    nextReminderAt: { type: Date },
    lockedForNonPayment: { type: Boolean, default: false },
    gracePeriodDays: { type: Number, default: 0 },
    missedPaymentCount: { type: Number, default: 0 },
    repaymentProgress: { type: Number, default: 0 },
    totalRepayments: { type: Number, default: 0 },
    overdueDays: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 },
    coinsRedeemed: { type: Number, default: 0 },
    walletAmountRedeemed: { type: Number, default: 0 },
    coinsCredited: { type: Boolean, default: false },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },
    isExchangeInitiated: { type: Boolean, default: false },
    stockAdjusted: { type: Boolean, default: false },
    stockReverted: { type: Boolean, default: false },
    couponUsageIncremented: { type: Boolean, default: false },
    affiliateUsageIncremented: { type: Boolean, default: false },
    couponUsageReverted: { type: Boolean, default: false },
    refundedToCoins: { type: Boolean, default: false },
    refundedToWallet: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ trackingNumber: 1 }, { unique: true });
orderSchema.index({ status: 1, updatedAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, refundedToWallet: 1 });
orderSchema.index({ user: 1, walletAmountRedeemed: 1 });
orderSchema.index({ "items.menuItem": 1 });

const Order =
  (models.Order as Model<IOrder> | undefined) ||
  model<IOrder>("Order", orderSchema);

export default Order;
