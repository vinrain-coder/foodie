import mongoose from "mongoose";
import AffiliateCompetitionEvent, {
  AffiliateCompetitionEventType,
} from "@/lib/db/models/affiliate-competition-event.model";
import { enqueueAffiliateCompetitionRefresh } from "@/lib/affiliate-competition/refresh";
import { processAffiliateCompetitionRefreshQueue } from "@/lib/workers/affiliate-competition.worker";
import { logAffiliateCompetition } from "@/lib/affiliate-competition/logging";

const COMMISSION_POINTS = 10;

type CreateAffiliateCompetitionEventInput = {
  affiliateId: string;
  orderId?: string;
  affiliateEarningId?: string;
  eventType: AffiliateCompetitionEventType;
  pointsDelta: number;
  qualifiedRevenueDelta: number;
  qualifiedOrdersDelta: number;
  occurredAt?: Date;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  session?: mongoose.ClientSession;
};

type EmitCommissionEventInput = {
  affiliateId: string;
  orderId: string;
  affiliateEarningId: string;
  amount: number;
  eventType: "commission_earned" | "commission_reversed";
  occurredAt?: Date;
  idempotencyKey: string;
  session?: mongoose.ClientSession;
  metadata?: Record<string, unknown>;
};

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: number }).code === 11000;

const toObjectId = (value: string, fieldName: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return new mongoose.Types.ObjectId(value);
};

export async function createAffiliateCompetitionEvent(
  input: CreateAffiliateCompetitionEventInput,
) {
  try {
    const created = await AffiliateCompetitionEvent.create(
      [
        {
          affiliateId: toObjectId(input.affiliateId, "affiliateId"),
          orderId: input.orderId
            ? toObjectId(input.orderId, "orderId")
            : undefined,
          affiliateEarningId: input.affiliateEarningId
            ? toObjectId(input.affiliateEarningId, "affiliateEarningId")
            : undefined,
          eventType: input.eventType,
          pointsDelta: Number(input.pointsDelta) || 0,
          qualifiedRevenueDelta: Number(input.qualifiedRevenueDelta) || 0,
          qualifiedOrdersDelta: Number(input.qualifiedOrdersDelta) || 0,
          occurredAt: input.occurredAt || new Date(),
          idempotencyKey: input.idempotencyKey,
          metadata: input.metadata,
        },
      ],
      input.session ? { session: input.session } : undefined,
    );

    return {
      created: true,
      duplicate: false,
      event: created[0],
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return {
        created: false,
        duplicate: true,
        event: null,
      };
    }
    throw error;
  }
}

export async function emitAffiliateCompetitionCommissionEvent(
  input: EmitCommissionEventInput,
) {
  const safeAmount = Math.max(0, Number(input.amount) || 0);
  const direction = input.eventType === "commission_earned" ? 1 : -1;

  const created = await createAffiliateCompetitionEvent({
    affiliateId: input.affiliateId,
    orderId: input.orderId,
    affiliateEarningId: input.affiliateEarningId,
    eventType: input.eventType,
    pointsDelta: COMMISSION_POINTS * direction,
    qualifiedRevenueDelta: safeAmount * direction,
    qualifiedOrdersDelta: 1 * direction,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata,
    session: input.session,
  });

  logAffiliateCompetition("info", "commission_event_emitted", {
    eventType: input.eventType,
    affiliateId: input.affiliateId,
    orderId: input.orderId,
    affiliateEarningId: input.affiliateEarningId,
    created: created.created,
    duplicate: created.duplicate,
    idempotencyKey: input.idempotencyKey,
  });

  if (created.created) {
    try {
      await enqueueAffiliateCompetitionRefresh({
        source: `event:${input.eventType}`,
      });

      if (!input.session) {
        void processAffiliateCompetitionRefreshQueue({
          limit: 2,
        }).catch((error) => {
          logAffiliateCompetition("error", "refresh_queue_background_error", {
            eventType: input.eventType,
            affiliateEarningId: input.affiliateEarningId,
            error:
              (error as { message?: string })?.message ||
              "Failed to process refresh queue in background",
          });
        });
      }
    } catch (error) {
      logAffiliateCompetition("error", "refresh_enqueue_failed", {
        eventType: input.eventType,
        affiliateEarningId: input.affiliateEarningId,
        error:
          (error as { message?: string })?.message ||
          "Failed to enqueue leaderboard refresh",
      });
    }
  }

  return created;
}
