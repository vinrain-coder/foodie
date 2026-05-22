import { Document, Model, Schema, Types, model, models } from "mongoose";

export type DeliveryJobState =
  | "unassigned"
  | "offered"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "failed"
  | "cancelled";

export type DeliveryJobTimelineActor = "system" | "rider" | "admin";

type LocationSnapshot = {
  address: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
};

type DeliveryJobTimelineEvent = {
  state: DeliveryJobState;
  actor: DeliveryJobTimelineActor;
  note?: string;
  at: Date;
  metadata?: Record<string, unknown>;
};

export interface IDeliveryJob extends Document {
  _id: Types.ObjectId;
  order: Types.ObjectId | string;
  restaurant?: Types.ObjectId | string;
  rider?: Types.ObjectId | string;
  proofOfDelivery?: Types.ObjectId | string;
  state: DeliveryJobState;
  promisedBy?: Date;
  pickup: LocationSnapshot;
  dropoff: LocationSnapshot;
  notes?: string;
  offeredAt?: Date;
  offerExpiresAt?: Date;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  deliveryOtpHash?: string;
  deliveryOtpGeneratedAt?: Date;
  deliveryOtpAttempts: number;
  otpRequired: boolean;
  otpRequiredReason?: string;
  handoffRiskScore: number;
  handoffRiskLevel: "low" | "medium" | "high";
  handoffRiskSignals: string[];
  currentOfferVersion: number;
  dispatchCandidateRiders: Array<Types.ObjectId | string>;
  dispatchAttemptedRiders: Array<Types.ObjectId | string>;
  dispatchCursor: number;
  dispatchSearchRounds: number;
  dispatchAttemptCount: number;
  lastCandidateSearchAt?: Date;
  manualAssignmentRequired: boolean;
  manualAssignmentReason?: string;
  manualEscalatedAt?: Date;
  lastMovementAt?: Date;
  lastIdleAlertAt?: Date;
  lastOffRouteAlertAt?: Date;
  lastEtaDriftAlertAt?: Date;
  statusTimeline: DeliveryJobTimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const locationSnapshotSchema = new Schema<LocationSnapshot>(
  {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false },
);

const deliveryJobTimelineEventSchema = new Schema<DeliveryJobTimelineEvent>(
  {
    state: {
      type: String,
      enum: [
        "unassigned",
        "offered",
        "accepted",
        "picked_up",
        "delivered",
        "failed",
        "cancelled",
      ],
      required: true,
    },
    actor: {
      type: String,
      enum: ["system", "rider", "admin"],
      required: true,
      default: "system",
    },
    note: { type: String, trim: true, default: "" },
    at: { type: Date, required: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const deliveryJobSchema = new Schema<IDeliveryJob>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      index: true,
    },
    rider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    proofOfDelivery: {
      type: Schema.Types.ObjectId,
      ref: "ProofOfDelivery",
      index: true,
    },
    state: {
      type: String,
      enum: [
        "unassigned",
        "offered",
        "accepted",
        "picked_up",
        "delivered",
        "failed",
        "cancelled",
      ],
      default: "unassigned",
      index: true,
    },
    promisedBy: { type: Date, index: true },
    pickup: { type: locationSnapshotSchema, required: true },
    dropoff: { type: locationSnapshotSchema, required: true },
    notes: { type: String, trim: true, default: "" },
    offeredAt: { type: Date },
    offerExpiresAt: { type: Date },
    acceptedAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String, trim: true, default: "" },
    deliveryOtpHash: { type: String, select: false },
    deliveryOtpGeneratedAt: { type: Date, select: false },
    deliveryOtpAttempts: { type: Number, default: 0, min: 0 },
    otpRequired: { type: Boolean, default: false, index: true },
    otpRequiredReason: { type: String, trim: true, default: "" },
    handoffRiskScore: { type: Number, default: 0, min: 0, max: 100, index: true },
    handoffRiskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      index: true,
    },
    handoffRiskSignals: { type: [String], default: [] },
    currentOfferVersion: { type: Number, default: 0, min: 0 },
    dispatchCandidateRiders: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    dispatchAttemptedRiders: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    dispatchCursor: { type: Number, default: 0, min: 0 },
    dispatchSearchRounds: { type: Number, default: 0, min: 0 },
    dispatchAttemptCount: { type: Number, default: 0, min: 0 },
    lastCandidateSearchAt: { type: Date },
    manualAssignmentRequired: { type: Boolean, default: false, index: true },
    manualAssignmentReason: { type: String, trim: true, default: "" },
    manualEscalatedAt: { type: Date, index: true },
    lastMovementAt: { type: Date },
    lastIdleAlertAt: { type: Date },
    lastOffRouteAlertAt: { type: Date },
    lastEtaDriftAlertAt: { type: Date },
    statusTimeline: { type: [deliveryJobTimelineEventSchema], default: [] },
  },
  { timestamps: true },
);

deliveryJobSchema.index({ state: 1, createdAt: -1 });
deliveryJobSchema.index({ rider: 1, state: 1, updatedAt: -1 });
deliveryJobSchema.index({ restaurant: 1, state: 1, updatedAt: -1 });
deliveryJobSchema.index({ state: 1, promisedBy: 1 });
deliveryJobSchema.index({ manualAssignmentRequired: 1, updatedAt: -1 });

const DeliveryJob =
  (models.DeliveryJob as Model<IDeliveryJob> | undefined) ||
  model<IDeliveryJob>("DeliveryJob", deliveryJobSchema);

export default DeliveryJob;
