import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IRestaurantBalance extends Document {
  restaurant: Types.ObjectId;
  pendingBalance: number;
  availableBalance: number;
  reservedBalance: number;
  lifetimeGross: number;
  lifetimeCommission: number;
  lifetimeNet: number;
  lifetimePaid: number;
  updatedAt: Date;
  createdAt: Date;
}

const restaurantBalanceSchema = new Schema<IRestaurantBalance>(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      unique: true,
      index: true,
    },
    pendingBalance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    reservedBalance: { type: Number, default: 0 },
    lifetimeGross: { type: Number, default: 0 },
    lifetimeCommission: { type: Number, default: 0 },
    lifetimeNet: { type: Number, default: 0 },
    lifetimePaid: { type: Number, default: 0 },
  },
  { timestamps: true },
);

restaurantBalanceSchema.index({ updatedAt: -1 });

const RestaurantBalance =
  (models.RestaurantBalance as Model<IRestaurantBalance> | undefined) ||
  model<IRestaurantBalance>("RestaurantBalance", restaurantBalanceSchema);

export default RestaurantBalance;
