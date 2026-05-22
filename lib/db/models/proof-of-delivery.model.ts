import { Document, Model, Schema, Types, model, models } from "mongoose";

export type ProofVerificationMethod = "otp" | "signature" | "photo" | "hybrid";

type ProofGeoTag = {
  lat: number;
  lng: number;
  accuracyM?: number;
};

export interface IProofOfDelivery extends Document {
  _id: Types.ObjectId;
  deliveryJob: Types.ObjectId | string;
  order: Types.ObjectId | string;
  rider: Types.ObjectId | string;
  verificationMethod: ProofVerificationMethod;
  otpVerified: boolean;
  otpMasked?: string;
  signatureUrl?: string;
  photoUrls: string[];
  geotag?: ProofGeoTag;
  recipientName?: string;
  note?: string;
  deliveredAt: Date;
  capturedAt: Date;
  clientCapturedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const proofGeoTagSchema = new Schema<ProofGeoTag>(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    accuracyM: { type: Number, min: 0, max: 10000 },
  },
  { _id: false },
);

const proofOfDeliverySchema = new Schema<IProofOfDelivery>(
  {
    deliveryJob: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryJob",
      required: true,
      unique: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    rider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    verificationMethod: {
      type: String,
      enum: ["otp", "signature", "photo", "hybrid"],
      required: true,
      default: "otp",
    },
    otpVerified: { type: Boolean, required: true, default: false },
    otpMasked: { type: String, trim: true, default: "" },
    signatureUrl: { type: String, trim: true, default: "" },
    photoUrls: { type: [String], default: [] },
    geotag: { type: proofGeoTagSchema, required: false },
    recipientName: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    deliveredAt: { type: Date, required: true, index: true },
    capturedAt: { type: Date, required: true, default: Date.now },
    clientCapturedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

proofOfDeliverySchema.index({ rider: 1, deliveredAt: -1 });
proofOfDeliverySchema.index({ order: 1, deliveredAt: -1 });

const ProofOfDelivery =
  (models.ProofOfDelivery as Model<IProofOfDelivery> | undefined) ||
  model<IProofOfDelivery>("ProofOfDelivery", proofOfDeliverySchema);

export default ProofOfDelivery;
