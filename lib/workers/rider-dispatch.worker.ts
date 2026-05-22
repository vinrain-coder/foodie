import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import DeliveryJob from "@/lib/db/models/delivery-job.model";
import { handleExpiredOffer } from "@/lib/dispatch/dispatch.service";

type ProcessExpiredDeliveryOffersInput = {
  limit?: number;
};

export async function processExpiredDeliveryOffers(
  input: ProcessExpiredDeliveryOffersInput = {},
) {
  await connectToDatabase();

  const now = new Date();
  const limit = Math.max(1, Math.min(250, Math.floor(input.limit || 100)));
  const expiredJobs = await DeliveryJob.find({
    state: "offered",
    offerExpiresAt: { $lte: now },
  })
    .sort({ offerExpiresAt: 1 })
    .limit(limit)
    .select("_id currentOfferVersion")
    .lean();

  let timedOut = 0;
  let autoReassigned = 0;
  let cancelled = 0;
  let escalated = 0;
  let skipped = 0;

  for (const candidate of expiredJobs) {
    if (!mongoose.Types.ObjectId.isValid(String(candidate._id))) {
      skipped += 1;
      continue;
    }

    const result = await handleExpiredOffer(
      String(candidate._id),
      Number(candidate.currentOfferVersion || 0),
    );

    if (result && (result as any).skipped) {
      skipped += 1;
      continue;
    }

    timedOut += 1;
    if (result && (result as any).escalated) {
      escalated += 1;
      continue;
    }

    if (result && (result as any).cancelled) {
      cancelled += 1;
      continue;
    }

    autoReassigned += 1;
  }

  return {
    scanned: expiredJobs.length,
    timedOut,
    autoReassigned,
    cancelled,
    escalated,
    skipped,
  };
}
