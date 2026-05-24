import { randomUUID } from "crypto";
import AffiliateEarning from "@/lib/db/models/affiliate-earning.model";
import AffiliateCompetitionEvent from "@/lib/db/models/affiliate-competition-event.model";
import { connectToDatabase } from "@/lib/db";
import { emitAffiliateCompetitionCommissionEvent } from "@/lib/affiliate-competition/events";
import { logAffiliateCompetition } from "@/lib/affiliate-competition/logging";

export async function reconcileAffiliateCompetitionEvents(options?: {
  limit?: number;
  runId?: string;
}) {
  await connectToDatabase();

  const runId = options?.runId || randomUUID();
  const limit = Math.max(0, Number(options?.limit || 0));

  const query = AffiliateEarning.find({
    status: { $in: ["earned", "cancelled"] as const },
  })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id affiliate order amount status createdAt updatedAt")
    .lean();

  if (limit > 0) {
    query.limit(limit);
  }

  const earnings = await query;

  const summary = {
    runId,
    scanned: earnings.length,
    missingEarn: 0,
    missingReverse: 0,
    created: 0,
    duplicates: 0,
    errors: 0,
  };

  for (const earning of earnings) {
    try {
      if (!earning?._id || !earning?.affiliate || !earning?.order) {
        continue;
      }

      const earnKey = `affcomp:earn:${earning._id.toString()}`;
      const reverseKey = `affcomp:reverse:${earning._id.toString()}`;

      const existingEarn = await AffiliateCompetitionEvent.findOne({
        idempotencyKey: earnKey,
      })
        .select("_id")
        .lean();

      if (!existingEarn) {
        summary.missingEarn += 1;
        const emitted = await emitAffiliateCompetitionCommissionEvent({
          affiliateId: earning.affiliate.toString(),
          orderId: earning.order.toString(),
          affiliateEarningId: earning._id.toString(),
          amount: Number(earning.amount || 0),
          eventType: "commission_earned",
          occurredAt: earning.createdAt || new Date(),
          idempotencyKey: earnKey,
          metadata: {
            source: "reconcile_affiliate_competition_events",
            runId,
          },
        });

        if (emitted.created) summary.created += 1;
        if (emitted.duplicate) summary.duplicates += 1;
      }

      if (earning.status === "cancelled") {
        const existingReverse = await AffiliateCompetitionEvent.findOne({
          idempotencyKey: reverseKey,
        })
          .select("_id")
          .lean();

        if (!existingReverse) {
          summary.missingReverse += 1;
          const reversed = await emitAffiliateCompetitionCommissionEvent({
            affiliateId: earning.affiliate.toString(),
            orderId: earning.order.toString(),
            affiliateEarningId: earning._id.toString(),
            amount: Number(earning.amount || 0),
            eventType: "commission_reversed",
            occurredAt: earning.updatedAt || earning.createdAt || new Date(),
            idempotencyKey: reverseKey,
            metadata: {
              source: "reconcile_affiliate_competition_events",
              runId,
            },
          });

          if (reversed.created) summary.created += 1;
          if (reversed.duplicate) summary.duplicates += 1;
        }
      }
    } catch (error: unknown) {
      summary.errors += 1;
      logAffiliateCompetition("error", "reconciliation_record_error", {
        runId,
        affiliateEarningId: earning?._id?.toString(),
        error:
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to reconcile affiliate earning",
      });
    }
  }

  logAffiliateCompetition("info", "reconciliation_completed", summary);

  return summary;
}
