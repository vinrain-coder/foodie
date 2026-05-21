import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IRestaurantPayoutAccount extends Document {
  restaurant: Types.ObjectId;
  payoutMethod:
    | "bank_transfer"
    | "mpesa_number"
    | "mpesa_till"
    | "mpesa_paybill"
    | "bank"
    | "mobile_money";
  accountName: string;
  bankName?: string;
  accountNumber?: string;
  bankCode?: string;
  mobileMoneyNumber?: string;
  mpesaTillNumber?: string;
  mpesaPaybillNumber?: string;
  paybillAccountNumber?: string;
  paystackRecipientCode?: string;
  recipientType?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantPayoutAccountSchema = new Schema<IRestaurantPayoutAccount>(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      unique: true,
      index: true,
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
      default: "bank_transfer",
      required: true,
    },
    accountName: { type: String, required: true },
    bankName: { type: String },
    accountNumber: { type: String },
    bankCode: { type: String },
    mobileMoneyNumber: { type: String },
    mpesaTillNumber: { type: String },
    mpesaPaybillNumber: { type: String },
    paybillAccountNumber: { type: String },
    paystackRecipientCode: { type: String, index: true },
    recipientType: { type: String },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

const RestaurantPayoutAccount =
  (models.RestaurantPayoutAccount as Model<IRestaurantPayoutAccount> | undefined) ||
  model<IRestaurantPayoutAccount>("RestaurantPayoutAccount", restaurantPayoutAccountSchema);

export default RestaurantPayoutAccount;
