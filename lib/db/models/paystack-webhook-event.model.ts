import { Document, Model, Schema, model, models } from "mongoose";

export interface IPaystackWebhookEvent extends Document {
  event: string;
  eventId: string;
  reference?: string;
  payload: Record<string, unknown>;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paystackWebhookEventSchema = new Schema<IPaystackWebhookEvent>(
  {
    event: { type: String, required: true, index: true },
    eventId: { type: String, required: true, unique: true, index: true },
    reference: { type: String, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const PaystackWebhookEvent =
  (models.PaystackWebhookEvent as Model<IPaystackWebhookEvent> | undefined) ||
  model<IPaystackWebhookEvent>("PaystackWebhookEvent", paystackWebhookEventSchema);

export default PaystackWebhookEvent;
