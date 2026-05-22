import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import DeliveryJob from "@/lib/db/models/delivery-job.model";
import DispatchEvent from "@/lib/db/models/dispatch-event.model";
import Order from "@/lib/db/models/order.model";
import Restaurant from "@/lib/db/models/restaurant.model";
import RiderProfile from "@/lib/db/models/rider-profile.model";
import { recordRiderAuditLog } from "@/lib/rider-audit";

type DispatchTrigger = "order_ready" | "offer_timeout";

type RiderCandidateScore = {
  riderUserId: string;
  riderProfileId: string;
  score: number;
  distanceKm?: number;
  etaMinutes?: number;
  activeLoad: number;
  reliabilityScore: number;
  slaRiskScore: number;
  heartbeatScore: number;
};

export const OFFER_TIMEOUT_MS = 15 * 1000;
export const MAX_DISPATCH_SEARCH_ROUNDS = 2;
const MAX_CANDIDATES_PER_SEARCH = 12;
const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getEstimatedKmh(vehicleType?: string) {
  switch (vehicleType) {
    case "bicycle":
      return 15;
    case "car":
      return 30;
    case "van":
      return 25;
    default:
      return 24;
  }
}

function estimateEtaMinutes(distanceKm: number, vehicleType?: string) {
  const kmh = Math.max(8, getEstimatedKmh(vehicleType));
  return (distanceKm / kmh) * 60;
}

function normalizeObjectId(value: unknown) {
  if (!value) return undefined;
  const parsed = value.toString();
  if (!mongoose.Types.ObjectId.isValid(parsed)) return undefined;
  return new mongoose.Types.ObjectId(parsed);
}

function appendTimeline(job: any, note: string, metadata?: Record<string, unknown>) {
  const timeline = [...(job.statusTimeline || [])];
  timeline.push({
    state: job.state,
    actor: "system",
    note,
    at: new Date(),
    metadata: metadata || {},
  });
  job.statusTimeline = timeline;
}

async function recordEvent(params: {
  deliveryJobId: mongoose.Types.ObjectId | string;
  orderId: mongoose.Types.ObjectId | string;
  eventType:
    | "candidate_search"
    | "offer_created"
    | "offer_timeout"
    | "auto_reassigned"
    | "assignment_cancelled"
    | "ops_escalated"
    | "manual_assigned";
  riderId?: mongoose.Types.ObjectId | string;
  actor?: "system" | "admin" | "rider";
  offerVersion?: number;
  expiresAt?: Date;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await DispatchEvent.create({
    deliveryJob: params.deliveryJobId,
    order: params.orderId,
    rider: params.riderId,
    eventType: params.eventType,
    actor: params.actor || "system",
    offerVersion: params.offerVersion || 0,
    expiresAt: params.expiresAt,
    reason: params.reason || "",
    metadata: params.metadata || {},
  });
}

async function getActiveLoadByRider(riderIds: mongoose.Types.ObjectId[]) {
  if (riderIds.length === 0) return new Map<string, number>();
  const rows = await DeliveryJob.aggregate([
    {
      $match: {
        rider: { $in: riderIds },
        state: { $in: ["accepted", "picked_up"] },
      },
    },
    { $group: { _id: "$rider", load: { $sum: 1 } } },
  ]);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row?._id) {
      map.set(String(row._id), Number(row.load || 0));
    }
  }
  return map;
}

async function scoreDispatchCandidates(params: {
  job: any;
  order: any;
  restaurant?: any;
  excludeRiderIds: mongoose.Types.ObjectId[];
}) {
  const now = Date.now();
  const restaurantPrepMin = Math.max(
    0,
    Number(params.restaurant?.averagePrepTimeMinutes || 30),
  );
  const promisedBy = params.job.promisedBy
    ? new Date(params.job.promisedBy).getTime()
    : undefined;
  const pickupLat = params.job.pickup?.lat;
  const pickupLng = params.job.pickup?.lng;

  const riderProfiles = await RiderProfile.find({
    status: "active",
    availability: "idle",
    isKycVerified: true,
    "identityVerification.status": "verified",
    "vehicleDocuments.status": "verified",
    user:
      params.excludeRiderIds.length > 0
        ? { $nin: params.excludeRiderIds }
        : { $exists: true },
  })
    .select(
      "_id user vehicleType capacity currentLocation currentHeartbeatAt acceptanceRate rating completedJobs",
    )
    .limit(200)
    .lean();

  const candidateUserIds = riderProfiles
    .map((profile) => normalizeObjectId(profile.user))
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value));
  const loadMap = await getActiveLoadByRider(candidateUserIds);

  const candidates: RiderCandidateScore[] = [];
  for (const profile of riderProfiles) {
    const riderUserId = profile.user?.toString();
    if (!riderUserId) continue;

    const activeLoad = loadMap.get(riderUserId) || 0;
    const profileCapacity = Math.max(1, Number(profile.capacity || 1));
    if (activeLoad >= profileCapacity) continue;

    const heartbeatAgeMs = profile.currentHeartbeatAt
      ? now - new Date(profile.currentHeartbeatAt).getTime()
      : HEARTBEAT_STALE_MS * 10;
    const heartbeatScore = clamp(100 - heartbeatAgeMs / 4000, 0, 100);

    let distanceKm: number | undefined;
    let etaMinutes: number | undefined;
    if (
      Number.isFinite(pickupLat) &&
      Number.isFinite(pickupLng) &&
      Number.isFinite(profile.currentLocation?.lat) &&
      Number.isFinite(profile.currentLocation?.lng)
    ) {
      distanceKm = haversineKm(
        Number(profile.currentLocation!.lat),
        Number(profile.currentLocation!.lng),
        Number(pickupLat),
        Number(pickupLng),
      );
      etaMinutes = estimateEtaMinutes(distanceKm, profile.vehicleType);
    }

    const distanceScore =
      distanceKm === undefined ? 55 : clamp(100 - distanceKm * 5, 0, 100);
    const etaScore =
      etaMinutes === undefined ? 55 : clamp(100 - etaMinutes * 2.2, 0, 100);
    const loadScore = activeLoad === 0 ? 100 : clamp(100 - activeLoad * 50, 0, 100);

    const acceptanceScore = clamp(Number(profile.acceptanceRate || 0), 0, 100);
    const ratingScore = clamp((Number(profile.rating || 0) / 5) * 100, 0, 100);
    const completedJobsScore = clamp(Number(profile.completedJobs || 0) * 2, 0, 100);
    const reliabilityScore =
      acceptanceScore * 0.45 + ratingScore * 0.35 + completedJobsScore * 0.2;

    let slaRiskScore = 60;
    if (promisedBy !== undefined) {
      const minutesUntilPromise = (promisedBy - now) / 60000;
      const etaForSla = etaMinutes ?? 25;
      const projectedSlack = minutesUntilPromise - (restaurantPrepMin + etaForSla);
      slaRiskScore = clamp(100 + projectedSlack * 4, 0, 100);
    }

    const score =
      distanceScore * 0.3 +
      etaScore * 0.2 +
      loadScore * 0.15 +
      reliabilityScore * 0.2 +
      slaRiskScore * 0.1 +
      heartbeatScore * 0.05;

    candidates.push({
      riderUserId,
      riderProfileId: profile._id.toString(),
      score: Number(score.toFixed(3)),
      distanceKm:
        distanceKm !== undefined ? Number(distanceKm.toFixed(3)) : undefined,
      etaMinutes:
        etaMinutes !== undefined ? Number(etaMinutes.toFixed(2)) : undefined,
      activeLoad,
      reliabilityScore: Number(reliabilityScore.toFixed(2)),
      slaRiskScore: Number(slaRiskScore.toFixed(2)),
      heartbeatScore: Number(heartbeatScore.toFixed(2)),
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES_PER_SEARCH);
}

async function escalateToOps(job: any, reason: string, metadata?: Record<string, unknown>) {
  const previousState = job.state;
  job.state = "unassigned";
  job.rider = undefined;
  job.offerExpiresAt = undefined;
  job.manualAssignmentRequired = true;
  job.manualAssignmentReason = reason;
  job.manualEscalatedAt = new Date();
  appendTimeline(job, "Dispatch escalated to ops for manual assignment.", metadata);
  await job.save();
  await recordRiderAuditLog({
    riderId: job.rider?.toString?.() || undefined,
    deliveryJobId: job._id,
    orderId: job.order,
    actorType: "system",
    action: "status_transition",
    fromStatus: previousState,
    toStatus: "unassigned",
    reason,
    metadata,
  });

  await recordEvent({
    deliveryJobId: job._id,
    orderId: job.order,
    eventType: "ops_escalated",
    offerVersion: job.currentOfferVersion || 0,
    reason,
    metadata,
  });

  return {
    success: true,
    escalated: true,
    reason,
    jobId: job._id.toString(),
  };
}

async function assignNextOffer(params: {
  job: any;
  candidates: RiderCandidateScore[];
  trigger: DispatchTrigger;
  previousRiderId?: string;
  timeoutReason?: string;
}) {
  const candidateById = new Map(
    params.candidates.map((candidate) => [candidate.riderUserId, candidate]),
  );
  const candidateIds = (params.job.dispatchCandidateRiders || []).map((id: any) =>
    id.toString(),
  );
  let cursor = Math.max(0, Number(params.job.dispatchCursor || 0));

  while (cursor < candidateIds.length) {
    const riderId = candidateIds[cursor];
    const profile = await RiderProfile.findOne({
      user: riderId,
      status: "active",
      availability: "idle",
      isKycVerified: true,
      "identityVerification.status": "verified",
      "vehicleDocuments.status": "verified",
    })
      .select("_id user")
      .lean();

    if (!profile) {
      cursor += 1;
      continue;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OFFER_TIMEOUT_MS);
    const nextOfferVersion = Math.max(0, Number(params.job.currentOfferVersion || 0)) + 1;
    const scorecard = candidateById.get(riderId);
    const previousState = params.job.state;

    params.job.state = "offered";
    params.job.rider = new mongoose.Types.ObjectId(riderId);
    params.job.offeredAt = now;
    params.job.offerExpiresAt = expiresAt;
    params.job.currentOfferVersion = nextOfferVersion;
    params.job.dispatchCursor = cursor + 1;
    params.job.dispatchAttemptCount = Math.max(
      0,
      Number(params.job.dispatchAttemptCount || 0),
    ) + 1;
    params.job.manualAssignmentRequired = false;
    params.job.manualAssignmentReason = "";
    params.job.manualEscalatedAt = undefined;
    params.job.dispatchAttemptedRiders = Array.from(
      new Set([...(params.job.dispatchAttemptedRiders || []), riderId]),
    );

    appendTimeline(params.job, "Dispatch offer created for ranked rider candidate.", {
      riderId,
      trigger: params.trigger,
      dispatchScore: scorecard?.score,
      etaMinutes: scorecard?.etaMinutes,
      distanceKm: scorecard?.distanceKm,
    });
    await params.job.save();
    await recordRiderAuditLog({
      riderId,
      deliveryJobId: params.job._id,
      orderId: params.job.order,
      actorType: params.trigger === "order_ready" ? "system" : "system",
      action: "status_transition",
      fromStatus: previousState,
      toStatus: "offered",
      reason: "Dispatch offer created",
      metadata: {
        trigger: params.trigger,
        offerVersion: nextOfferVersion,
      },
    });

    if (
      params.trigger === "offer_timeout" &&
      params.previousRiderId &&
      params.previousRiderId !== riderId
    ) {
      await recordEvent({
        deliveryJobId: params.job._id,
        orderId: params.job.order,
        riderId: params.previousRiderId,
        eventType: "auto_reassigned",
        offerVersion: nextOfferVersion,
        reason: params.timeoutReason || "Offer timeout",
        metadata: { nextRiderId: riderId },
      });
    }

    await recordEvent({
      deliveryJobId: params.job._id,
      orderId: params.job.order,
      riderId,
      eventType: "offer_created",
      offerVersion: nextOfferVersion,
      expiresAt,
      reason: "Offer dispatched to scored candidate",
      metadata: scorecard
        ? {
            dispatchScore: scorecard.score,
            etaMinutes: scorecard.etaMinutes,
            distanceKm: scorecard.distanceKm,
            activeLoad: scorecard.activeLoad,
            reliabilityScore: scorecard.reliabilityScore,
            slaRiskScore: scorecard.slaRiskScore,
            heartbeatScore: scorecard.heartbeatScore,
          }
        : {},
    });

    return {
      success: true,
      escalated: false,
      offeredRiderId: riderId,
      offerVersion: nextOfferVersion,
      expiresAt,
    };
  }

  return { success: false, escalated: false };
}

async function runDispatch(params: {
  jobId: string;
  trigger: DispatchTrigger;
  previousRiderId?: string;
  timeoutReason?: string;
}) {
  await connectToDatabase();

  const job = await DeliveryJob.findById(params.jobId);
  if (!job) return { success: false, message: "Delivery job not found" };
  if (["accepted", "picked_up", "delivered", "cancelled", "failed"].includes(job.state)) {
    return { success: true, skipped: true, reason: "Job is no longer dispatchable" };
  }

  const order = await Order.findById(job.order).select("status isDelivered").lean();
  if (!order || order.isDelivered || order.status === "cancelled") {
    const previousState = job.state;
    job.state = "cancelled";
    job.cancelledAt = new Date();
    job.failureReason = !order
      ? "Linked order missing"
      : order.isDelivered
        ? "Order already delivered"
        : "Order cancelled";
    appendTimeline(job, "Dispatch cancelled because linked order is no longer deliverable.");
    await job.save();
    await recordRiderAuditLog({
      riderId: job.rider?.toString?.() || undefined,
      deliveryJobId: job._id,
      orderId: job.order,
      actorType: "system",
      action: "status_transition",
      fromStatus: previousState,
      toStatus: "cancelled",
      reason: job.failureReason,
    });
    await recordEvent({
      deliveryJobId: job._id,
      orderId: job.order,
      eventType: "assignment_cancelled",
      offerVersion: job.currentOfferVersion || 0,
      reason: job.failureReason,
    });
    return { success: true, cancelled: true };
  }

  const currentCandidates = (job.dispatchCandidateRiders || []).map((id) => id.toString());
  let candidates: RiderCandidateScore[] = [];
  let shouldSearch = currentCandidates.length === 0 || Number(job.dispatchCursor || 0) >= currentCandidates.length;

  if (shouldSearch) {
    const nextRound = Math.max(0, Number(job.dispatchSearchRounds || 0)) + 1;
    if (nextRound > MAX_DISPATCH_SEARCH_ROUNDS) {
      return escalateToOps(job, "No rider accepted after dispatch retries", {
        dispatchRounds: job.dispatchSearchRounds || 0,
        attemptCount: job.dispatchAttemptCount || 0,
      });
    }

    const excludeIds = (job.dispatchAttemptedRiders || [])
      .map((id: any) => normalizeObjectId(id))
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const restaurant = job.restaurant
      ? await Restaurant.findById(job.restaurant)
          .select("_id averagePrepTimeMinutes")
          .lean()
      : undefined;
    candidates = await scoreDispatchCandidates({
      job,
      order,
      restaurant,
      excludeRiderIds: excludeIds,
    });

    job.dispatchCandidateRiders = candidates.map(
      (candidate) => new mongoose.Types.ObjectId(candidate.riderUserId),
    );
    job.dispatchCursor = 0;
    job.dispatchSearchRounds = nextRound;
    job.lastCandidateSearchAt = new Date();
    appendTimeline(job, "Candidate search completed for dispatch scoring.", {
      round: nextRound,
      candidateCount: candidates.length,
      trigger: params.trigger,
    });
    await job.save();

    await recordEvent({
      deliveryJobId: job._id,
      orderId: job.order,
      eventType: "candidate_search",
      offerVersion: job.currentOfferVersion || 0,
      reason: `Ranked ${candidates.length} rider candidates`,
      metadata: {
        round: nextRound,
        topCandidates: candidates.slice(0, 3).map((candidate) => ({
          riderUserId: candidate.riderUserId,
          score: candidate.score,
          etaMinutes: candidate.etaMinutes,
          distanceKm: candidate.distanceKm,
          reliabilityScore: candidate.reliabilityScore,
          slaRiskScore: candidate.slaRiskScore,
        })),
      },
    });

    if (candidates.length === 0) {
      return escalateToOps(job, "No eligible rider candidates found", {
        trigger: params.trigger,
        dispatchRound: nextRound,
      });
    }
  } else {
    const candidateIds = currentCandidates.map((id) => new mongoose.Types.ObjectId(id));
    const profiles = await RiderProfile.find({ user: { $in: candidateIds } })
      .select("_id user acceptanceRate rating completedJobs currentHeartbeatAt currentLocation vehicleType capacity")
      .lean();
    const map = new Map(profiles.map((profile) => [profile.user.toString(), profile]));
    candidates = currentCandidates.map((id) => {
      const profile = map.get(id);
      return {
        riderUserId: id,
        riderProfileId: profile?._id?.toString() || "",
        score: 0,
        activeLoad: 0,
        reliabilityScore: Number(profile?.acceptanceRate || 0),
        slaRiskScore: 0,
        heartbeatScore: 0,
      };
    });
  }

  const offerResult = await assignNextOffer({
    job,
    candidates,
    trigger: params.trigger,
    previousRiderId: params.previousRiderId,
    timeoutReason: params.timeoutReason,
  });

  if (!offerResult.success) {
    const searchRounds = Math.max(0, Number(job.dispatchSearchRounds || 0));
    if (searchRounds >= MAX_DISPATCH_SEARCH_ROUNDS) {
      return escalateToOps(job, "No rider accepted after candidate fallback", {
        dispatchRounds: searchRounds,
      });
    }

    job.dispatchCandidateRiders = [];
    job.dispatchCursor = 0;
    await job.save();
    return runDispatch(params);
  }

  return offerResult;
}

export async function dispatchOrderReady(jobId: string) {
  return runDispatch({ jobId, trigger: "order_ready" });
}

export async function handleExpiredOffer(jobId: string, expectedOfferVersion?: number) {
  await connectToDatabase();
  const now = new Date();
  const expiredJob = await DeliveryJob.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(jobId),
      state: "offered",
      offerExpiresAt: { $lte: now },
      ...(expectedOfferVersion !== undefined
        ? { currentOfferVersion: expectedOfferVersion }
        : {}),
    },
    {
      $set: {
        state: "unassigned",
      },
      $unset: {
        rider: 1,
        offerExpiresAt: 1,
      },
    },
    { new: false },
  ).lean();

  if (!expiredJob) {
    return { success: true, skipped: true, reason: "Offer already handled" };
  }

  await recordEvent({
    deliveryJobId: expiredJob._id,
    orderId: expiredJob.order,
    riderId: expiredJob.rider || undefined,
    eventType: "offer_timeout",
    offerVersion: expiredJob.currentOfferVersion || 0,
    reason: "Offer response timeout reached",
  });
  await recordRiderAuditLog({
    riderId: expiredJob.rider?.toString?.() || undefined,
    deliveryJobId: expiredJob._id,
    orderId: expiredJob.order,
    actorType: "system",
    action: "status_transition",
    fromStatus: "offered",
    toStatus: "unassigned",
    reason: "Offer timeout",
    metadata: {
      expectedOfferVersion,
      currentOfferVersion: expiredJob.currentOfferVersion || 0,
    },
  });

  const resettableJob = await DeliveryJob.findById(expiredJob._id);
  if (resettableJob) {
    appendTimeline(resettableJob, "Offer timed out, dispatch fallback started.");
    await resettableJob.save();
  }

  return runDispatch({
    jobId,
    trigger: "offer_timeout",
    previousRiderId: expiredJob.rider?.toString(),
    timeoutReason: "Offer timed out",
  });
}
