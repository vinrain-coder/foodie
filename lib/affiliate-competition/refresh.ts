import {
  AFFILIATE_COMPETITION_CADENCES,
  AffiliateCompetitionCadence,
} from "@/lib/affiliate-competition/periods";
import { connectToDatabase } from "@/lib/db";
import AffiliateCompetitionRefreshRequest from "@/lib/db/models/affiliate-competition-refresh.model";
import { logAffiliateCompetition } from "@/lib/affiliate-competition/logging";

export async function enqueueAffiliateCompetitionRefresh(input?: {
  cadences?: AffiliateCompetitionCadence[];
  source?: string;
}) {
  await connectToDatabase();

  const cadences =
    input?.cadences && input.cadences.length > 0
      ? input.cadences
      : [...AFFILIATE_COMPETITION_CADENCES];

  const requestedAt = new Date();

  const results = await Promise.all(
    cadences.map(async (cadence) => {
      const updated = await AffiliateCompetitionRefreshRequest.findOneAndUpdate(
        {
          cadence,
          status: "pending",
        },
        {
          $set: {
            requestedAt,
            source: input?.source || "unspecified",
            error: undefined,
          },
          $setOnInsert: {
            cadence,
            status: "pending",
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

      logAffiliateCompetition("info", "refresh_enqueued", {
        cadence,
        refreshRequestId: updated?._id?.toString(),
        source: input?.source || "unspecified",
      });

      return updated;
    }),
  );

  return {
    cadences,
    enqueued: results.filter(Boolean).length,
  };
}
