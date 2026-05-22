import { Document, Model, Schema, Types, model, models } from "mongoose";

export type RiderPayoutStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

export interface IRiderPayout extends Document {
  rider: Types.ObjectId;
  amount: number;
  currency: string;
  status: RiderPayoutStatus;
  scheduledFor: Date;
  paidAt?: Date;
  failedReason?: string;
  idempotencyKey?: string;
  reference?: string;
  source: "auto" | "manual";
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const riderPayoutSchema = new Schema<IRiderPayout>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "KES", uppercase: true },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    scheduledFor: { type: Date, required: true, index: true },
    paidAt: { type: Date },
    failedReason: { type: String, trim: true, default: "" },
    idempotencyKey: { type: String, trim: true, index: true },
    reference: { type: String, trim: true, index: true },
    source: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
      index: true,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

riderPayoutSchema.index({ rider: 1, createdAt: -1 });
riderPayoutSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true },
);

const RiderPayout =
  (models.RiderPayout as Model<IRiderPayout> | undefined) ||
  model<IRiderPayout>("RiderPayout", riderPayoutSchema);

export default RiderPayout;
