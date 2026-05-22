import { Document, Model, Schema, Types, model, models } from "mongoose";

export type DispatchEventType =
  | "candidate_search"
  | "offer_created"
  | "offer_accepted"
  | "offer_declined"
  | "offer_timeout"
  | "auto_reassigned"
  | "assignment_cancelled"
  | "ops_escalated"
  | "manual_assigned"
  | "rider_idle_alert"
  | "off_route_alert"
  | "eta_drift_alert";

export type DispatchEventActor = "system" | "rider" | "admin";

export interface IDispatchEvent extends Document {
  _id: Types.ObjectId;
  deliveryJob: Types.ObjectId | string;
  order: Types.ObjectId | string;
  rider?: Types.ObjectId | string;
  eventType: DispatchEventType;
  actor: DispatchEventActor;
  offerVersion: number;
  expiresAt?: Date;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const dispatchEventSchema = new Schema<IDispatchEvent>(
  {
    deliveryJob: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryJob",
      required: true,
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
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "candidate_search",
        "offer_created",
        "offer_accepted",
        "offer_declined",
        "offer_timeout",
        "auto_reassigned",
        "assignment_cancelled",
        "ops_escalated",
        "manual_assigned",
        "rider_idle_alert",
        "off_route_alert",
        "eta_drift_alert",
      ],
      required: true,
      index: true,
    },
    actor: {
      type: String,
      enum: ["system", "rider", "admin"],
      required: true,
      default: "system",
    },
    offerVersion: { type: Number, required: true, min: 0, default: 0 },
    expiresAt: { type: Date },
    reason: { type: String, trim: true, default: "" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

dispatchEventSchema.index({ deliveryJob: 1, createdAt: -1 });
dispatchEventSchema.index({ order: 1, createdAt: -1 });
dispatchEventSchema.index({ rider: 1, createdAt: -1 });
dispatchEventSchema.index({ eventType: 1, createdAt: -1 });

const DispatchEvent =
  (models.DispatchEvent as Model<IDispatchEvent> | undefined) ||
  model<IDispatchEvent>("DispatchEvent", dispatchEventSchema);

export default DispatchEvent;
