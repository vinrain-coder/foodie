import { IRestaurantReviewInput } from "@/types";
import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IRestaurantReview
  extends Document,
    Omit<IRestaurantReviewInput, "user" | "restaurant"> {
  _id: Types.ObjectId;
  user: Types.ObjectId | string;
  restaurant: Types.ObjectId | string;
  rating: number;
  comment: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantReviewSchema = new Schema<IRestaurantReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

restaurantReviewSchema.index({ restaurant: 1, createdAt: -1 });
restaurantReviewSchema.index({ restaurant: 1, user: 1 }, { unique: true });

const RestaurantReview =
  (models.RestaurantReview as Model<IRestaurantReview> | undefined) ||
  model<IRestaurantReview>("RestaurantReview", restaurantReviewSchema);

export default RestaurantReview;
