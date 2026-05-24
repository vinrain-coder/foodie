import { Document, Model, model, models, Schema } from "mongoose";

export const AFFILIATE_COMPETITION_CADENCES = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export type AffiliateCompetitionCadence =
  (typeof AFFILIATE_COMPETITION_CADENCES)[number];

export type AffiliateCompetitionPeriodStatus = "active" | "finalized";

export interface IAffiliateCompetitionPeriod extends Document {
  cadence: AffiliateCompetitionCadence;
  startAt: Date;
  endAt: Date;
  status: AffiliateCompetitionPeriodStatus;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const affiliateCompetitionPeriodSchema =
  new Schema<IAffiliateCompetitionPeriod>(
    {
      cadence: {
        type: String,
        enum: AFFILIATE_COMPETITION_CADENCES,
        required: true,
        index: true,
      },
      startAt: { type: Date, required: true },
      endAt: { type: Date, required: true },
      status: {
        type: String,
        enum: ["active", "finalized"],
        default: "active",
        required: true,
        index: true,
      },
      timezone: { type: String, default: "UTC" },
    },
    {
      timestamps: true,
      collection: "affiliate_competition_periods",
    },
  );

affiliateCompetitionPeriodSchema.index(
  { cadence: 1, startAt: 1 },
  { unique: true, name: "aff_comp_period_cadence_start_unique" },
);
affiliateCompetitionPeriodSchema.index(
  { cadence: 1, status: 1, startAt: -1 },
  { name: "aff_comp_period_cadence_status_start" },
);

const AffiliateCompetitionPeriod =
  (models.AffiliateCompetitionPeriod as
    | Model<IAffiliateCompetitionPeriod>
    | undefined) ||
  model<IAffiliateCompetitionPeriod>(
    "AffiliateCompetitionPeriod",
    affiliateCompetitionPeriodSchema,
  );

export default AffiliateCompetitionPeriod;
