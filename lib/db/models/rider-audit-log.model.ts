import { Document, Model, Schema, Types, model, models } from "mongoose";

export type RiderAuditActorType = "system" | "rider" | "admin";
export type RiderAuditAction =
  | "status_transition"
  | "admin_override"
  | "kyc_review"
  | "device_binding"
  | "risk_score_update";

export interface IRiderAuditLog extends Document {
  rider?: Types.ObjectId;
  deliveryJob?: Types.ObjectId;
  order?: Types.ObjectId;
  actorType: RiderAuditActorType;
  actorId?: Types.ObjectId;
  action: RiderAuditAction;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const riderAuditLogSchema = new Schema<IRiderAuditLog>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    deliveryJob: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryJob",
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    actorType: {
      type: String,
      enum: ["system", "rider", "admin"],
      required: true,
      default: "system",
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    action: {
      type: String,
      enum: [
        "status_transition",
        "admin_override",
        "kyc_review",
        "device_binding",
        "risk_score_update",
      ],
      required: true,
      index: true,
    },
    fromStatus: { type: String, trim: true, default: "" },
    toStatus: { type: String, trim: true, default: "" },
    reason: { type: String, trim: true, default: "" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

riderAuditLogSchema.index({ deliveryJob: 1, createdAt: -1 });
riderAuditLogSchema.index({ rider: 1, createdAt: -1 });
riderAuditLogSchema.index({ action: 1, createdAt: -1 });

const RiderAuditLog =
  (models.RiderAuditLog as Model<IRiderAuditLog> | undefined) ||
  model<IRiderAuditLog>("RiderAuditLog", riderAuditLogSchema);

export default RiderAuditLog;
