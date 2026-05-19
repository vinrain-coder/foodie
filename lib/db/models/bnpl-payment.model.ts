import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IBNPLPayment extends Document {
  _id: Types.ObjectId;
  order: Types.ObjectId | string;
  user: Types.ObjectId | string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  status: "pending" | "success" | "failed" | "cancelled" | "reversed";
  type: "repayment" | "adjustment" | "waiver" | "refund";
  notes?: string;
  processedBy?: string; // "system", "admin", "customer"
  source: "paystack" | "wallet" | "coins" | "manual" | "system";
  paymentResult?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const bnplPaymentSchema = new Schema<IBNPLPayment>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    reference: { type: String },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled", "reversed"],
      default: "pending",
      index: true,
    },
    type: {
      type: String,
      enum: ["repayment", "adjustment", "waiver", "refund"],
      default: "repayment",
      index: true,
    },
    notes: { type: String },
    processedBy: { type: String },
    source: {
      type: String,
      enum: ["paystack", "wallet", "coins", "manual", "system"],
      required: true,
    },
    paymentResult: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  },
);

bnplPaymentSchema.index({ order: 1, createdAt: -1 });
bnplPaymentSchema.index({ user: 1, createdAt: -1 });
bnplPaymentSchema.index(
  { source: 1, reference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      reference: { $type: "string", $gt: "" },
      source: { $type: "string" },
    },
    name: "bnpl_source_reference_unique_v2",
  },
);

const BNPLPayment =
  (models.BNPLPayment as Model<IBNPLPayment> | undefined) ||
  model<IBNPLPayment>("BNPLPayment", bnplPaymentSchema);

export default BNPLPayment;
