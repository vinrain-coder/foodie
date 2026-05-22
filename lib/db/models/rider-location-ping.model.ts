import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IRiderLocationPing extends Document {
  _id: Types.ObjectId;
  rider: Types.ObjectId | string;
  deliveryJob?: Types.ObjectId | string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  battery?: number;
  routeDeviationM?: number;
  etaDriftMinutes?: number;
  alertFlags?: string[];
  sampleCount: number;
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const riderLocationPingSchema = new Schema<IRiderLocationPing>(
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
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: { type: Number },
    heading: { type: Number },
    battery: { type: Number },
    routeDeviationM: { type: Number, min: 0 },
    etaDriftMinutes: { type: Number },
    alertFlags: { type: [String], default: [] },
    sampleCount: { type: Number, default: 1, min: 1 },
    capturedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true },
);

riderLocationPingSchema.index(
  { capturedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 14 },
);
riderLocationPingSchema.index({ rider: 1, capturedAt: -1 });

const RiderLocationPing =
  (models.RiderLocationPing as Model<IRiderLocationPing> | undefined) ||
  model<IRiderLocationPing>("RiderLocationPing", riderLocationPingSchema);

export default RiderLocationPing;
