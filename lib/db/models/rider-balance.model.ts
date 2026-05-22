import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IRiderBalance extends Document {
  rider: Types.ObjectId;
  pendingBalance: number;
  availableBalance: number;
  reservedBalance: number;
  lifetimeEarned: number;
  lifetimePaid: number;
  createdAt: Date;
  updatedAt: Date;
}

const riderBalanceSchema = new Schema<IRiderBalance>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    pendingBalance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    reservedBalance: { type: Number, default: 0 },
    lifetimeEarned: { type: Number, default: 0 },
    lifetimePaid: { type: Number, default: 0 },
  },
  { timestamps: true },
);

riderBalanceSchema.index({ updatedAt: -1 });

const RiderBalance =
  (models.RiderBalance as Model<IRiderBalance> | undefined) ||
  model<IRiderBalance>("RiderBalance", riderBalanceSchema);

export default RiderBalance;
