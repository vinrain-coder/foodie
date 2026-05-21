import { Document, Model, Schema, Types, model, models } from "mongoose";

export type RestaurantLedgerEntryType =
  | "order_capture"
  | "order_reversal"
  | "payout_debit"
  | "payout_refund"
  | "manual_adjustment"
  | "pending_release";

export interface IRestaurantLedgerEntry extends Document {
  restaurant: Types.ObjectId;
  order?: Types.ObjectId;
  payout?: Types.ObjectId;
  type: RestaurantLedgerEntryType;
  amount: number;
  currency: string;
  settlementState?: "pending" | "available" | "reversed";
  availableOn?: Date;
  releasedAt?: Date;
  reversedAt?: Date;
  source: "order" | "payout" | "admin" | "system";
  actor?: Types.ObjectId;
  reference?: string;
  notes?: string;
  breakdown?: {
    netItems: number;
    deliveryFee: number;
    commissionRate: number;
    commissionAmount: number;
    platformAmount: number;
    restaurantAmount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const restaurantLedgerEntrySchema = new Schema<IRestaurantLedgerEntry>(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    payout: {
      type: Schema.Types.ObjectId,
      ref: "RestaurantPayout",
      index: true,
    },
    type: {
      type: String,
      enum: [
        "order_capture",
        "order_reversal",
        "payout_debit",
        "payout_refund",
        "manual_adjustment",
        "pending_release",
      ],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "KES" },
    settlementState: {
      type: String,
      enum: ["pending", "available", "reversed"],
      default: "available",
      index: true,
    },
    availableOn: { type: Date },
    releasedAt: { type: Date },
    reversedAt: { type: Date },
    source: {
      type: String,
      enum: ["order", "payout", "admin", "system"],
      required: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    reference: { type: String, index: true },
    notes: { type: String },
    breakdown: {
      netItems: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      commissionRate: { type: Number, default: 0 },
      commissionAmount: { type: Number, default: 0 },
      platformAmount: { type: Number, default: 0 },
      restaurantAmount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

restaurantLedgerEntrySchema.index({ restaurant: 1, createdAt: -1 });
restaurantLedgerEntrySchema.index({ order: 1, type: 1 }, { unique: true, sparse: true });
restaurantLedgerEntrySchema.index({ payout: 1, type: 1 }, { unique: true, sparse: true });

const RestaurantLedgerEntry =
  (models.RestaurantLedgerEntry as Model<IRestaurantLedgerEntry> | undefined) ||
  model<IRestaurantLedgerEntry>("RestaurantLedgerEntry", restaurantLedgerEntrySchema);

export default RestaurantLedgerEntry;
