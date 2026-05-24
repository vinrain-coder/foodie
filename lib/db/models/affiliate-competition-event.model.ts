import { Document, Model, Schema, Types, model, models } from "mongoose";

export const AFFILIATE_COMPETITION_EVENT_TYPES = [
  "commission_earned",
  "commission_reversed",
  "manual_adjustment",
] as const;

export type AffiliateCompetitionEventType =
  (typeof AFFILIATE_COMPETITION_EVENT_TYPES)[number];

export interface IAffiliateCompetitionEvent extends Document {
  affiliateId: Types.ObjectId;
  orderId?: Types.ObjectId;
  affiliateEarningId?: Types.ObjectId;
  eventType: AffiliateCompetitionEventType;
  pointsDelta: number;
  qualifiedRevenueDelta: number;
  qualifiedOrdersDelta: number;
  occurredAt: Date;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const affiliateCompetitionEventSchema = new Schema<IAffiliateCompetitionEvent>(
  {
    affiliateId: {
      type: Schema.Types.ObjectId,
      ref: "Affiliate",
      required: true,
      index: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    affiliateEarningId: {
      type: Schema.Types.ObjectId,
      ref: "AffiliateEarning",
      index: true,
    },
    eventType: {
      type: String,
      enum: AFFILIATE_COMPETITION_EVENT_TYPES,
      required: true,
      index: true,
    },
    pointsDelta: { type: Number, required: true },
    qualifiedRevenueDelta: { type: Number, required: true },
    qualifiedOrdersDelta: { type: Number, required: true },
    occurredAt: { type: Date, required: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: "affiliate_competition_events",
  },
);

affiliateCompetitionEventSchema.index(
  { affiliateId: 1, occurredAt: -1 },
  { name: "aff_comp_event_affiliate_occurred" },
);

const AffiliateCompetitionEvent =
  (models.AffiliateCompetitionEvent as
    | Model<IAffiliateCompetitionEvent>
    | undefined) ||
  model<IAffiliateCompetitionEvent>(
    "AffiliateCompetitionEvent",
    affiliateCompetitionEventSchema,
  );

export default AffiliateCompetitionEvent;
