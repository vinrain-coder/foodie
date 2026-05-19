import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IStockSubscription extends Document {
  menuItem: Types.ObjectId;
  email: string;
  subscribedAt: Date;
  isNotified: boolean;
  notifiedAt?: Date;
  unsubscribeToken: string;
}

const stockSubscriptionSchema = new Schema<IStockSubscription>(
  {
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    isNotified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: {
      type: Date,
    },
    unsubscribeToken: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

// Indexes for performance
stockSubscriptionSchema.index({ menuItem: 1, isNotified: 1 });
stockSubscriptionSchema.index({ email: 1 });
stockSubscriptionSchema.index({ unsubscribeToken: 1 });
stockSubscriptionSchema.index({ subscribedAt: -1 });

const StockSubscription =
  (models.StockSubscription as Model<IStockSubscription> | undefined) ||
  model<IStockSubscription>("StockSubscription", stockSubscriptionSchema);

export default StockSubscription;
