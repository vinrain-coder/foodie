import { Document, Model, Schema, Types, model, models } from "mongoose";

type RiderReconciliationMismatch = {
  rider: Types.ObjectId | string;
  completedDeliveriesCount: number;
  ledgerDeliveriesCount: number;
  completedEarningsTotal: number;
  ledgerEarningsTotal: number;
  paidOutTotal: number;
  openLiability: number;
  integrityDelta: number;
  reasons: string[];
};

export interface IRiderPayoutReconciliation extends Document {
  runDate: string;
  windowStart: Date;
  windowEnd: Date;
  totalRidersChecked: number;
  totalMismatches: number;
  mismatches: RiderReconciliationMismatch[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const mismatchSchema = new Schema<RiderReconciliationMismatch>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    completedDeliveriesCount: { type: Number, default: 0 },
    ledgerDeliveriesCount: { type: Number, default: 0 },
    completedEarningsTotal: { type: Number, default: 0 },
    ledgerEarningsTotal: { type: Number, default: 0 },
    paidOutTotal: { type: Number, default: 0 },
    openLiability: { type: Number, default: 0 },
    integrityDelta: { type: Number, default: 0 },
    reasons: { type: [String], default: [] },
  },
  { _id: false },
);

const riderPayoutReconciliationSchema = new Schema<IRiderPayoutReconciliation>(
  {
    runDate: { type: String, required: true, unique: true, index: true },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    totalRidersChecked: { type: Number, default: 0 },
    totalMismatches: { type: Number, default: 0 },
    mismatches: { type: [mismatchSchema], default: [] },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

const RiderPayoutReconciliation =
  (models.RiderPayoutReconciliation as
    | Model<IRiderPayoutReconciliation>
    | undefined) ||
  model<IRiderPayoutReconciliation>(
    "RiderPayoutReconciliation",
    riderPayoutReconciliationSchema,
  );

export default RiderPayoutReconciliation;
