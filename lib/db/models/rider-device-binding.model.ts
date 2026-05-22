import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IRiderDeviceBinding extends Document {
  rider: Types.ObjectId;
  deviceFingerprintHash: string;
  userAgent?: string;
  ipHash?: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  seenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const riderDeviceBindingSchema = new Schema<IRiderDeviceBinding>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceFingerprintHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userAgent: { type: String, trim: true, default: "" },
    ipHash: { type: String, trim: true, default: "" },
    firstSeenAt: { type: Date, required: true, default: Date.now },
    lastSeenAt: { type: Date, required: true, default: Date.now },
    seenCount: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);

riderDeviceBindingSchema.index(
  { rider: 1, deviceFingerprintHash: 1 },
  { unique: true },
);
riderDeviceBindingSchema.index({ deviceFingerprintHash: 1, updatedAt: -1 });

const RiderDeviceBinding =
  (models.RiderDeviceBinding as Model<IRiderDeviceBinding> | undefined) ||
  model<IRiderDeviceBinding>("RiderDeviceBinding", riderDeviceBindingSchema);

export default RiderDeviceBinding;
