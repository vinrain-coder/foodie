import AffiliateEarning from "../db/models/affiliate-earning.model";
import { connectToDatabase } from "../db";
import { emitAffiliateCompetitionCommissionEvent } from "../affiliate-competition/events";
import { pathToFileURL } from "url";

type BackfillAffiliateCompetitionEventsInput = {
  limit?: number;
};

export async function backfillAffiliateCompetitionEvents(
  input: BackfillAffiliateCompetitionEventsInput = {},
) {
  await connectToDatabase();

  const limit =
    Number.isFinite(input.limit) && Number(input.limit) > 0
      ? Math.floor(Number(input.limit))
      : 0;

  const filter = { status: { $in: ["earned", "cancelled"] as const } };
  const query = AffiliateEarning.find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .select("_id affiliate order amount status createdAt updatedAt");

  if (limit > 0) {
    query.limit(limit);
  }

  const earnings = await query.lean();

  const stats = {
    scanned: earnings.length,
    earnCreated: 0,
    earnDuplicate: 0,
    reverseCreated: 0,
    reverseDuplicate: 0,
  };

  for (const earning of earnings) {
    if (!earning?._id || !earning?.affiliate || !earning?.order) {
      continue;
    }

    const earnResult = await emitAffiliateCompetitionCommissionEvent({
      affiliateId: earning.affiliate.toString(),
      orderId: earning.order.toString(),
      affiliateEarningId: earning._id.toString(),
      amount: Number(earning.amount || 0),
      eventType: "commission_earned",
      occurredAt: earning.createdAt || new Date(),
      idempotencyKey: `affcomp:earn:${earning._id.toString()}`,
      metadata: { source: "backfill_affiliate_competitions" },
    });

    if (earnResult.created) stats.earnCreated += 1;
    if (earnResult.duplicate) stats.earnDuplicate += 1;

    if (earning.status === "cancelled") {
      const reverseResult = await emitAffiliateCompetitionCommissionEvent({
        affiliateId: earning.affiliate.toString(),
        orderId: earning.order.toString(),
        affiliateEarningId: earning._id.toString(),
        amount: Number(earning.amount || 0),
        eventType: "commission_reversed",
        occurredAt: earning.updatedAt || earning.createdAt || new Date(),
        idempotencyKey: `affcomp:reverse:${earning._id.toString()}`,
        metadata: { source: "backfill_affiliate_competitions" },
      });

      if (reverseResult.created) stats.reverseCreated += 1;
      if (reverseResult.duplicate) stats.reverseDuplicate += 1;
    }
  }

  return stats;
}

async function runFromCli() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  const stats = await backfillAffiliateCompetitionEvents({ limit });
  console.log("Affiliate competition backfill completed:", stats);
  process.exit(0);
}

const invokedAsScript =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsScript) {
  runFromCli().catch((error) => {
    console.error("Affiliate competition backfill failed:", error);
    process.exit(1);
  });
}
