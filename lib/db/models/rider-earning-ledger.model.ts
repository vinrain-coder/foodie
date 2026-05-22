import { Document, Model, Schema, Types, model, models } from "mongoose";

export type RiderLedgerType =
  | "base"
  | "base_fare"
  | "distance"
  | "wait_time"
  | "bonus"
  | "penalty"
  | "adjustment";
export type RiderLedgerStatus = "pending" | "available" | "paid" | "held";

export interface IRiderEarningLedger extends Document {
  _id: Types.ObjectId;
  rider: Types.ObjectId | string;
  deliveryJob?: Types.ObjectId | string;
  type: RiderLedgerType;
  amount: number;
  currency: string;
  status: RiderLedgerStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
  immutableKey?: string;
  source: "delivery_job" | "payout" | "system" | "admin";
  availableOn?: Date;
  releasedAt?: Date;
  settlementBatchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const riderEarningLedgerSchema = new Schema<IRiderEarningLedger>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deliveryJob: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryJob",
      index: true,
    },
    type: {
      type: String,
      enum: [
        "base",
        "base_fare",
        "distance",
        "wait_time",
        "bonus",
        "penalty",
        "adjustment",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "KES", uppercase: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "available", "paid", "held"],
      default: "pending",
      index: true,
    },
    reason: { type: String, trim: true, default: "" },
    metadata: { type: Schema.Types.Mixed },
    immutableKey: { type: String, trim: true, default: "" },
    source: {
      type: String,
      enum: ["delivery_job", "payout", "system", "admin"],
      default: "system",
      index: true,
    },
    availableOn: { type: Date, index: true },
    releasedAt: { type: Date },
    settlementBatchId: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

riderEarningLedgerSchema.index({ rider: 1, status: 1, createdAt: -1 });
riderEarningLedgerSchema.index({ deliveryJob: 1, createdAt: -1, type: 1 });
riderEarningLedgerSchema.index(
  { immutableKey: 1 },
  { unique: true, sparse: true },
);
riderEarningLedgerSchema.index(
  { deliveryJob: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deliveryJob: { $exists: true },
      type: { $in: ["base", "base_fare"] },
    },
  },
);

const APPEND_ONLY_BLOCKED_METHODS = [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "findByIdAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const;

for (const method of APPEND_ONLY_BLOCKED_METHODS) {
  riderEarningLedgerSchema.pre(
    method as any,
    function appendOnlyLedgerGuard(next: (error?: Error) => void) {
      next(
        new Error(
          "RiderEarningLedger is append-only. Create compensating entries instead of mutating existing ones.",
        ),
      );
    },
  );
}

const RiderEarningLedger =
  (models.RiderEarningLedger as Model<IRiderEarningLedger> | undefined) ||
  model<IRiderEarningLedger>("RiderEarningLedger", riderEarningLedgerSchema);

export default RiderEarningLedger;
