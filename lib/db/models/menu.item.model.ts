import { Document, Model, Types, model, models, Schema } from "mongoose";
import { IMenuItemInput } from "@/types";

export interface IMenuItem extends Document, IMenuItemInput {
  _id: Types.ObjectId;
  restaurant?: Types.ObjectId;
  numReviews: number;
  avgRating: number;
  ratingDistribution: { rating: number; count: number }[];
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: false,
      index: true,
    },

    images: [String],
    videoLink: {
      type: String,
    },
    shortDescription: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },

    countInStock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (this: IMenuItem, value: number) {
          if (this.isModified("countInStock") && value < 0) {
            return false;
          }
          return true;
        },
        message: "Count in stock cannot be negative",
      },
    },
    tags: { type: [String], default: ["new arrival"] },
    avgRating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
    ratingDistribution: [
      {
        rating: {
          type: Number,
          required: true,
        },
        count: {
          type: Number,
          required: true,
        },
      },
    ],
    numSales: {
      type: Number,
      required: true,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      required: true,
      default: false,
    },
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  },
);

menuItemSchema.index({ restaurant: 1, updatedAt: -1 });

const MenuItem =
  (models.MenuItem as Model<IMenuItem>) ||
  model<IMenuItem>("MenuItem", menuItemSchema);

export default MenuItem;
