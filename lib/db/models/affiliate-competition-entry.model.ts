import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IAffiliateCompetitionEntry extends Document {
  periodId: Types.ObjectId;
  affiliateId: Types.ObjectId;
  points: number;
  qualifiedRevenue: number;
  qualifiedOrders: number;
  rank: number;
  eligible: boolean;
  ineligibilityReason?: string;
  refundRatio?: number;
  updatedAt: Date;
}

const affiliateCompetitionEntrySchema = new Schema<IAffiliateCompetitionEntry>(
  {
    periodId: {
      type: Schema.Types.ObjectId,
      ref: "AffiliateCompetitionPeriod",
      required: true,
      index: true,
    },
    affiliateId: {
      type: Schema.Types.ObjectId,
      ref: "Affiliate",
      required: true,
      index: true,
    },
    points: { type: Number, default: 0, required: true },
    qualifiedRevenue: { type: Number, default: 0, required: true },
    qualifiedOrders: { type: Number, default: 0, required: true },
    rank: { type: Number, default: 0, required: true },
    eligible: { type: Boolean, default: true, required: true },
    ineligibilityReason: { type: String },
    refundRatio: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: "affiliate_competition_entries",
  },
);

affiliateCompetitionEntrySchema.index(
  { periodId: 1, affiliateId: 1 },
  { unique: true, name: "aff_comp_entry_period_affiliate_unique" },
);
affiliateCompetitionEntrySchema.index(
  {
    periodId: 1,
    points: -1,
    qualifiedRevenue: -1,
    qualifiedOrders: -1,
    affiliateId: 1,
  },
  { name: "aff_comp_entry_period_rank_sort" },
);

const AffiliateCompetitionEntry =
  (models.AffiliateCompetitionEntry as
    | Model<IAffiliateCompetitionEntry>
    | undefined) ||
  model<IAffiliateCompetitionEntry>(
    "AffiliateCompetitionEntry",
    affiliateCompetitionEntrySchema,
  );

export default AffiliateCompetitionEntry;
