import { Document, Model, Schema, Types, model, models } from "mongoose";

/**
 * @deprecated Use BNPLPayment model and financing fields in Order model instead.
 */
export interface IInstallment extends Document {
  _id: Types.ObjectId;
  order: Types.ObjectId | string;
  user: Types.ObjectId | string;
  amount: number;
  dueDate: Date;
  status: "pending" | "paid" | "overdue";
  paidAt?: Date;
  paymentResult?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const installmentSchema = new Schema<IInstallment>(
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
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date },
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
  },
  {
    timestamps: true,
  },
);

installmentSchema.index({ user: 1, status: 1 });
installmentSchema.index({ dueDate: 1, status: 1 });

const Installment =
  (models.Installment as Model<IInstallment> | undefined) ||
  model<IInstallment>("Installment", installmentSchema);

export default Installment;
