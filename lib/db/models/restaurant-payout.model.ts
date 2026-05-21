import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IRestaurantPayout extends Document {
  restaurant: Types.ObjectId;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "rejected" | "failed";
  requestedBy: Types.ObjectId;
  processedBy?: Types.ObjectId;
  payoutMethod:
    | "bank_transfer"
    | "mpesa_number"
    | "mpesa_till"
    | "mpesa_paybill"
    | "bank"
    | "mobile_money";
  destinationMasked: string;
  accountReference?: string;
  paystackRecipientCode?: string;
  paystackTransferCode?: string;
  paystackReference?: string;
  idempotencyKey: string;
  adminNote?: string;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantPayoutSchema = new Schema<IRestaurantPayout>(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "KES" },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "rejected", "failed"],
      default: "pending",
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    payoutMethod: {
      type: String,
      enum: [
        "bank_transfer",
        "mpesa_number",
        "mpesa_till",
        "mpesa_paybill",
        "bank",
        "mobile_money",
      ],
      required: true,
    },
    destinationMasked: { type: String, required: true },
    accountReference: { type: String },
    paystackRecipientCode: { type: String },
    paystackTransferCode: { type: String, index: true },
    paystackReference: { type: String, index: true },
    idempotencyKey: { type: String, unique: true, index: true, required: true },
    adminNote: { type: String },
    failureReason: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

restaurantPayoutSchema.index({ restaurant: 1, createdAt: -1 });

const RestaurantPayout =
  (models.RestaurantPayout as Model<IRestaurantPayout> | undefined) ||
  model<IRestaurantPayout>("RestaurantPayout", restaurantPayoutSchema);

export default RestaurantPayout;
