import { Document, Model, Schema, Types, model, models } from "mongoose";

export type RestaurantApplicationStatus = "pending" | "approved" | "rejected";

export interface IRestaurant extends Document {
  ownerId: Types.ObjectId;
  name: string;
  slug: string;
  menuItems: Types.ObjectId[];
  logo?: string;
  coverImage?: string;
  phone: string;
  whatsapp: string;
  location: string;
  description: string;
  openingHours: string;
  deliveryFee: number;
  minimumOrderAmount: number;
  isApproved: boolean;
  isActive: boolean;
  status: RestaurantApplicationStatus;
  adminNote?: string;
  email?: string;
  cuisineTypes: string[];
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  averagePrepTimeMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    menuItems: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "MenuItem",
        },
      ],
      default: [],
    },
    logo: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    openingHours: { type: String, required: true, trim: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    minimumOrderAmount: { type: Number, required: true, default: 0 },
    isApproved: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    cuisineTypes: { type: [String], default: [] },
    acceptsDelivery: { type: Boolean, default: true },
    acceptsPickup: { type: Boolean, default: false },
    averagePrepTimeMinutes: { type: Number, default: 30 },
  },
  { timestamps: true },
);

restaurantSchema.index({ ownerId: 1, status: 1 });
restaurantSchema.index({ status: 1, createdAt: -1 });
restaurantSchema.index({ menuItems: 1 });

const Restaurant =
  (models.Restaurant as Model<IRestaurant>) ||
  model<IRestaurant>("Restaurant", restaurantSchema);

export default Restaurant;
