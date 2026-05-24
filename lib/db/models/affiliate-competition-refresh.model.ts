import { Document, Model, model, models, Schema } from "mongoose";
import { AFFILIATE_COMPETITION_CADENCES, AffiliateCompetitionCadence } from "@/lib/db/models/affiliate-competition-period.model";

export type AffiliateCompetitionRefreshStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface IAffiliateCompetitionRefreshRequest extends Document {
  cadence: AffiliateCompetitionCadence;
  status: AffiliateCompetitionRefreshStatus;
  source?: string;
  requestedAt: Date;
  lastAttemptAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const affiliateCompetitionRefreshRequestSchema =
  new Schema<IAffiliateCompetitionRefreshRequest>(
    {
      cadence: {
        type: String,
        enum: AFFILIATE_COMPETITION_CADENCES,
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
        required: true,
        index: true,
      },
      source: { type: String },
      requestedAt: { type: Date, required: true, index: true },
      lastAttemptAt: { type: Date },
      error: { type: String },
    },
    {
      timestamps: true,
      collection: "affiliate_competition_refresh_requests",
    },
  );

affiliateCompetitionRefreshRequestSchema.index(
  { cadence: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
    name: "aff_comp_refresh_pending_unique",
  },
);
affiliateCompetitionRefreshRequestSchema.index(
  { status: 1, requestedAt: 1 },
  { name: "aff_comp_refresh_status_requested" },
);

const AffiliateCompetitionRefreshRequest =
  (models.AffiliateCompetitionRefreshRequest as
    | Model<IAffiliateCompetitionRefreshRequest>
    | undefined) ||
  model<IAffiliateCompetitionRefreshRequest>(
    "AffiliateCompetitionRefreshRequest",
    affiliateCompetitionRefreshRequestSchema,
  );

export default AffiliateCompetitionRefreshRequest;
