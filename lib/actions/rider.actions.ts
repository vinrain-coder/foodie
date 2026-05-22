"use server";

import { createHash, randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { ActionState } from "@/types/action-state";
import { connectToDatabase } from "../db";
import DeliveryJob, {
  DeliveryJobTimelineActor,
  DeliveryJobState,
} from "../db/models/delivery-job.model";
import RiderDeviceBinding from "../db/models/rider-device-binding.model";
import DispatchEvent, {
  DispatchEventActor,
  DispatchEventType,
} from "../db/models/dispatch-event.model";
import { dispatchOrderReady, OFFER_TIMEOUT_MS } from "../dispatch/dispatch.service";
import Order from "../db/models/order.model";
import ProofOfDelivery from "../db/models/proof-of-delivery.model";
import Restaurant from "../db/models/restaurant.model";
import SupportTicket from "../db/models/support-ticket.model";
import RiderBalance from "../db/models/rider-balance.model";
import RiderEarningLedger from "../db/models/rider-earning-ledger.model";
import RiderLocationPing from "../db/models/rider-location-ping.model";
import RiderProfile from "../db/models/rider-profile.model";
import { getServerSession } from "../get-session";
import { getRiderScope } from "../rider-scope";
import { recordRiderAuditLog } from "../rider-audit";
import { getRiderPayoutPolicy } from "../rider-finance";
import {
  evaluateHandoffRisk,
  evaluateRiderDeviceRisk,
  hasCompleteRiderCompliance,
  hashSecuritySignal,
} from "../rider-security";
import {
  canTransitionOrderStatus,
  ORDER_STATUS_LABELS,
  OrderTrackingStatus,
  shouldSendStatusNotification,
} from "../order-tracking";
import { formatError } from "../utils";
import {
  sendAdminEventNotification,
  sendAskReviewOrderItems,
  sendOrderTrackingNotification,
} from "../email/transactional";
import { recordRiderCompletedJobEarning } from "../workers/rider-finance.worker";
import { getSetting } from "./setting.actions";
import { isAdminRole, isRiderRole } from "../dashboard-access";
import { sanitizeMediaUrl } from "../uploadthing-media";

type RiderAvailabilityInput = "offline" | "idle" | "on_trip";

const ACTIVE_JOB_STATES: DeliveryJobState[] = [
  "accepted",
  "picked_up",
];

const TRACKING_BASE_PATH = "/track";
const DELIVERY_OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_DELIVERY_OTP_ATTEMPTS = 5;
const MAX_CONCURRENT_ACTIVE_JOBS = 1;
const LOCATION_SNAPSHOT_MIN_INTERVAL_MS = 15 * 1000;
const LOCATION_COMPRESSION_WINDOW_MS = 60 * 1000;
const IDLE_ALERT_THRESHOLD_MS = 8 * 60 * 1000;
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const IDLE_MOVEMENT_RESET_KM = 0.05;
const OFF_ROUTE_PICKUP_THRESHOLD_KM = 6;
const OFF_ROUTE_DROPOFF_THRESHOLD_KM = 3;
const ETA_DRIFT_THRESHOLD_MINUTES = 15;
const HIGH_RISK_OTP_THRESHOLD = 35;

type CompletionProofInput = {
  recipientName?: string;
  note?: string;
  signatureUrl?: string;
  photoUrls?: string[];
  geotag?: {
    lat: number;
    lng: number;
    accuracyM?: number;
  };
  clientCapturedAt?: Date | string;
};

type NormalizedCompletionProof = {
  recipientName: string;
  note: string;
  signatureUrl?: string;
  photoUrls: string[];
  geotag: {
    lat: number;
    lng: number;
    accuracyM?: number;
  };
  clientCapturedAt?: Date;
};

function buildTrackingLink(trackingNumber: string) {
  return `${TRACKING_BASE_PATH}/${encodeURIComponent(trackingNumber)}`;
}

function hashDeliveryOtp(otp: string) {
  const secret = process.env.AUTH_SECRET || "delivery-otp";
  return createHash("sha256").update(`${otp}:${secret}`).digest("hex");
}

function assertObjectId(value: string, label: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

function maskOtp(otp: string) {
  if (otp.length < 2) return "******";
  return `****${otp.slice(-2)}`;
}

async function ensureRiderComplianceReady(riderUserId: string) {
  const profile = await RiderProfile.findOne({
    user: new mongoose.Types.ObjectId(riderUserId),
  }).lean();
  if (!profile) {
    throw new Error("Rider profile not found");
  }

  const complete = hasCompleteRiderCompliance({
    isKycVerified: profile.isKycVerified,
    identityVerification: profile.identityVerification as any,
    vehicleDocuments: profile.vehicleDocuments as any,
    licenseNumber: profile.licenseNumber,
    nationalIdNumber: profile.nationalIdNumber,
  });

  if (!complete) {
    throw new Error(
      "Complete KYC identity and verified vehicle documents before activation",
    );
  }
}

function parseOptionalDate(value?: string | Date) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function normalizeCompletionProof(
  proof?: CompletionProofInput,
): NormalizedCompletionProof {
  const recipientName = String(proof?.recipientName || "").trim();
  if (!recipientName) {
    throw new Error("Proof of delivery recipient name is required");
  }

  const photoUrls = (proof?.photoUrls || [])
    .map((value) => sanitizeMediaUrl(value))
    .filter(Boolean)
    .slice(0, 5);
  if (photoUrls.length === 0) {
    throw new Error("Upload at least one delivery proof photo before completion");
  }

  const geotag = proof?.geotag;
  if (
    !geotag ||
    !Number.isFinite(geotag.lat) ||
    !Number.isFinite(geotag.lng) ||
    geotag.lat < -90 ||
    geotag.lat > 90 ||
    geotag.lng < -180 ||
    geotag.lng > 180
  ) {
    throw new Error("Valid delivery geotag is required before completion");
  }

  const signatureUrl = sanitizeMediaUrl(proof?.signatureUrl);
  const parsedClientCapturedAt = parseOptionalDate(proof?.clientCapturedAt);

  return {
    recipientName,
    note: String(proof?.note || "").trim(),
    signatureUrl: signatureUrl || undefined,
    photoUrls,
    geotag: {
      lat: geotag.lat,
      lng: geotag.lng,
      accuracyM:
        geotag.accuracyM !== undefined &&
        Number.isFinite(geotag.accuracyM) &&
        geotag.accuracyM >= 0
          ? geotag.accuracyM
          : undefined,
    },
    clientCapturedAt: parsedClientCapturedAt,
  };
}

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

function estimateEtaMinutes(distanceKm: number, speedKmh?: number) {
  const normalizedSpeed = clamp(speedKmh || 24, 8, 90);
  return (distanceKm / normalizedSpeed) * 60;
}

function toSpeedKmh(inputSpeed?: number) {
  if (inputSpeed === undefined || !Number.isFinite(inputSpeed)) return undefined;
  // GPS speed is usually m/s from device APIs; enforce a sane cap in km/h.
  return clamp(inputSpeed * 3.6, 0, 120);
}

function shouldEmitAlert(lastAlertAt?: Date | null) {
  if (!lastAlertAt) return true;
  return Date.now() - new Date(lastAlertAt).getTime() >= ALERT_COOLDOWN_MS;
}

function appendDeliveryJobTimeline(params: {
  job: any;
  state: DeliveryJobState;
  actor: DeliveryJobTimelineActor;
  note?: string;
  metadata?: Record<string, unknown>;
}) {
  const timeline = [...(params.job.statusTimeline || [])];
  const latest = timeline[timeline.length - 1];
  if (latest?.state === params.state && latest?.actor === params.actor) {
    return;
  }

  timeline.push({
    state: params.state,
    actor: params.actor,
    note: params.note || "",
    at: new Date(),
    metadata: params.metadata || {},
  });
  params.job.statusTimeline = timeline;
}

async function logDispatchEvent(params: {
  deliveryJobId: mongoose.Types.ObjectId | string;
  orderId: mongoose.Types.ObjectId | string;
  eventType: DispatchEventType;
  actor: DispatchEventActor;
  riderId?: mongoose.Types.ObjectId | string;
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
    actor: params.actor,
    offerVersion: params.offerVersion || 1,
    expiresAt: params.expiresAt,
    reason: params.reason || "",
    metadata: params.metadata || {},
  });
}

async function getActiveJobsCountForRider(riderId: mongoose.Types.ObjectId) {
  return DeliveryJob.countDocuments({
    rider: riderId,
    state: { $in: ["accepted", "picked_up"] },
  });
}

async function notifyCustomerOrderStatus(
  order: any,
  status: OrderTrackingStatus,
  message: string,
) {
  if (!shouldSendStatusNotification(status)) return;
  const email = order.userEmail || order?.user?.email;
  if (!email) return;

  const { site } = await getSetting();
  await sendOrderTrackingNotification({
    order,
    statusLabel: ORDER_STATUS_LABELS[status],
    statusMessage: message,
    trackingLink: `${site.url}${buildTrackingLink(order.trackingNumber)}`,
  });
}

function appendTrackingHistory(order: any, input: { status: OrderTrackingStatus; message: string; location?: string }) {
  const current = [...(order.trackingHistory || [])];
  const last = current[current.length - 1];
  if (last?.status === input.status && last?.message === input.message) {
    return false;
  }

  current.push({
    status: input.status,
    message: input.message,
    location: input.location,
    source: "courier",
    metadata: {},
    createdAt: new Date(),
  });
  order.trackingHistory = current;
  return true;
}

async function transitionOrderFromRider(params: {
  order: any;
  nextStatus: OrderTrackingStatus;
  message: string;
  riderName: string;
  location?: string;
}) {
  const { order, nextStatus, message, riderName, location } = params;
  if (order.status !== nextStatus) {
    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${nextStatus}.`,
      );
    }
    order.status = nextStatus;
    if (nextStatus === "delivered") {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }
    if (nextStatus === "shipped") {
      order.shipment = {
        ...order.shipment,
        courierName: riderName,
        dispatchedAt: order.shipment?.dispatchedAt || new Date(),
      };
    }
  }

  appendTrackingHistory(order, {
    status: nextStatus,
    message,
    location,
  });
  await order.save();

  await notifyCustomerOrderStatus(order, nextStatus, message);

  if (nextStatus === "delivered") {
    const finalEmail = order.userEmail || order?.user?.email;
    if (finalEmail) {
      if (!order.userEmail) order.userEmail = finalEmail;
      await sendAskReviewOrderItems(order);
    }
  }
}

export async function bootstrapRiderProfile(): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session?.user) throw new Error("Unauthorized");
    if (!isRiderRole(session.user.role)) {
      throw new Error("Only rider accounts can initialize rider profiles");
    }

    const profile = await RiderProfile.findOneAndUpdate(
      { user: session.user.id },
      {
        $setOnInsert: {
          user: session.user.id,
          fullName: session.user.name || "",
          role: "rider",
          phone: "",
          vehicleType: "motorbike",
          status: "pending_kyc",
          availability: "offline",
          isKycVerified: false,
          licenseNumber: "",
          nationalIdNumber: "",
          identityDocumentUrl: "",
          selfieUrl: "",
          vehicleLicenseUrl: "",
          vehicleInsuranceUrl: "",
          vehiclePhotoUrl: "",
          identityVerification: {
            status: "missing",
            documentUrl: "",
            selfieUrl: "",
          },
          vehicleDocuments: {
            status: "missing",
            licenseUrl: "",
            insuranceUrl: "",
            vehiclePhotoUrl: "",
          },
          riskScore: 0,
          riskLevel: "low",
          riskFlags: [],
          completedJobs: 0,
          cancelledJobs: 0,
          acceptanceRate: 0,
          rating: 5,
        },
      },
      { upsert: true, new: true },
    );

    return {
      success: true,
      message: "Rider profile ready",
      data: JSON.parse(JSON.stringify(profile)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function submitRiderComplianceDocuments(input: {
  nationalIdNumber: string;
  licenseNumber: string;
  identityDocumentUrl: string;
  selfieUrl: string;
  vehicleLicenseUrl: string;
  vehicleInsuranceUrl?: string;
  vehiclePhotoUrl: string;
}): Promise<ActionState> {
  try {
    await connectToDatabase();
    const scope = await getRiderScope();

    const nationalIdNumber = String(input.nationalIdNumber || "").trim();
    const licenseNumber = String(input.licenseNumber || "").trim();
    const identityDocumentUrl = sanitizeMediaUrl(input.identityDocumentUrl);
    const selfieUrl = sanitizeMediaUrl(input.selfieUrl);
    const vehicleLicenseUrl = sanitizeMediaUrl(input.vehicleLicenseUrl);
    const vehicleInsuranceUrl = sanitizeMediaUrl(input.vehicleInsuranceUrl);
    const vehiclePhotoUrl = sanitizeMediaUrl(input.vehiclePhotoUrl);

    if (!nationalIdNumber || !licenseNumber) {
      throw new Error("National ID and license number are required");
    }
    if (!identityDocumentUrl || !selfieUrl) {
      throw new Error("Identity document and selfie are required");
    }
    if (!vehicleLicenseUrl || !vehiclePhotoUrl) {
      throw new Error("Vehicle license and vehicle photo are required");
    }

    await RiderProfile.findOneAndUpdate(
      { user: new mongoose.Types.ObjectId(scope.userId) },
      {
        $set: {
          nationalIdNumber,
          licenseNumber,
          identityDocumentUrl,
          selfieUrl,
          vehicleLicenseUrl,
          vehicleInsuranceUrl: vehicleInsuranceUrl || "",
          vehiclePhotoUrl,
          isKycVerified: false,
          kycVerifiedAt: undefined,
          kycRejectedReason: "",
          status: "pending_kyc",
          identityVerification: {
            documentUrl: identityDocumentUrl,
            selfieUrl,
            status: "pending",
            verifiedAt: undefined,
            reviewedBy: undefined,
            rejectionReason: "",
          },
          vehicleDocuments: {
            licenseUrl: vehicleLicenseUrl,
            insuranceUrl: vehicleInsuranceUrl || "",
            vehiclePhotoUrl,
            status: "pending",
            verifiedAt: undefined,
            reviewedBy: undefined,
            rejectionReason: "",
          },
        },
      },
      { new: true, upsert: true },
    );

    await recordRiderAuditLog({
      riderId: scope.userId,
      actorType: "rider",
      actorId: scope.userId,
      action: "kyc_review",
      fromStatus: "draft",
      toStatus: "pending",
      reason: "Rider submitted KYC and vehicle compliance documents",
    });

    revalidatePath("/rider/jobs");
    return {
      success: true,
      message: "Compliance documents submitted for verification",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function reviewRiderComplianceByAdmin(input: {
  riderUserId: string;
  approve: boolean;
  rejectionReason?: string;
}): Promise<ActionState> {
  try {
    await connectToDatabase();
    const admin = await getServerSession();
    if (!isAdminRole(admin?.user?.role)) throw new Error("Admin permission required");
    assertObjectId(input.riderUserId, "rider user id");

    const profile = await RiderProfile.findOne({
      user: new mongoose.Types.ObjectId(input.riderUserId),
    });
    if (!profile) throw new Error("Rider profile not found");

    const rejectionReason = String(input.rejectionReason || "").trim();
    if (!input.approve && !rejectionReason) {
      throw new Error("Provide a rejection reason");
    }

    if (input.approve) {
      const complete = hasCompleteRiderCompliance({
        isKycVerified: true,
        identityVerification: {
          status: "verified",
          documentUrl: profile.identityVerification?.documentUrl,
          selfieUrl: profile.identityVerification?.selfieUrl,
        },
        vehicleDocuments: {
          status: "verified",
          licenseUrl: profile.vehicleDocuments?.licenseUrl,
          insuranceUrl: profile.vehicleDocuments?.insuranceUrl,
          vehiclePhotoUrl: profile.vehicleDocuments?.vehiclePhotoUrl,
        },
        licenseNumber: profile.licenseNumber,
        nationalIdNumber: profile.nationalIdNumber,
      });
      if (!complete) {
        throw new Error("Profile is missing required KYC/vehicle fields");
      }
    }

    profile.isKycVerified = input.approve;
    profile.kycVerifiedAt = input.approve ? new Date() : undefined;
    profile.kycRejectedReason = input.approve ? "" : rejectionReason;
    profile.status = input.approve ? "active" : "pending_kyc";
    profile.identityVerification = {
      ...(profile.identityVerification as any),
      status: input.approve ? "verified" : "rejected",
      verifiedAt: input.approve ? new Date() : undefined,
      reviewedBy: new mongoose.Types.ObjectId(admin.user.id),
      rejectionReason: input.approve ? "" : rejectionReason,
    };
    profile.vehicleDocuments = {
      ...(profile.vehicleDocuments as any),
      status: input.approve ? "verified" : "rejected",
      verifiedAt: input.approve ? new Date() : undefined,
      reviewedBy: new mongoose.Types.ObjectId(admin.user.id),
      rejectionReason: input.approve ? "" : rejectionReason,
    };
    await profile.save();

    await recordRiderAuditLog({
      riderId: input.riderUserId,
      actorType: "admin",
      actorId: admin.user.id,
      action: "kyc_review",
      fromStatus: "pending",
      toStatus: input.approve ? "approved" : "rejected",
      reason: input.approve
        ? "Admin approved rider compliance"
        : rejectionReason,
    });

    revalidatePath("/admin/rider-dispatch");
    revalidatePath("/rider/jobs");
    return {
      success: true,
      message: input.approve
        ? "Rider compliance approved and account activated"
        : "Rider compliance rejected",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function setRiderAvailability(
  availability: RiderAvailabilityInput,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const scope = await getRiderScope();
    if (scope.riderStatus !== "active") {
      throw new Error("Rider profile must be active before going online");
    }

    if (!["offline", "idle", "on_trip"].includes(availability)) {
      throw new Error("Invalid availability value");
    }
    if (availability !== "offline") {
      await ensureRiderComplianceReady(scope.userId);
    }

    const riderObjectId = new mongoose.Types.ObjectId(scope.userId);
    const hasActiveJob = await DeliveryJob.exists({
      rider: riderObjectId,
      state: { $in: ACTIVE_JOB_STATES },
    });

    if (availability === "on_trip" && !hasActiveJob) {
      throw new Error("Cannot set on_trip without an active delivery job");
    }

    if (availability === "offline" && hasActiveJob) {
      throw new Error("Finish active delivery jobs before going offline");
    }

    if (availability === "idle" && scope.availability === "on_trip" && hasActiveJob) {
      throw new Error("Cannot switch to idle while currently on an active trip");
    }

    await RiderProfile.findByIdAndUpdate(scope.riderProfileId, {
      availability,
      updatedAt: new Date(),
    });

    await recordRiderAuditLog({
      riderId: scope.userId,
      actorType: "rider",
      actorId: scope.userId,
      action: "status_transition",
      fromStatus: scope.availability,
      toStatus: availability,
      reason: "Rider availability changed",
    });
    revalidatePath("/rider/jobs");
    return { success: true, message: `Availability set to ${availability}` };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function createDeliveryJobForPackedOrder(
  orderId: string,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    assertObjectId(orderId, "order id");

    const order = await Order.findById(orderId).lean();
    if (!order) throw new Error("Order not found");

    if (order.status !== "packed" || order.isDelivered) {
      return { success: true, message: "Dispatch not needed for this status" };
    }
    const existing = await DeliveryJob.findOne({ order: order._id }).lean();
    if (existing) {
      return { success: true, message: "Delivery job already exists" };
    }

    const restaurant = order.restaurant
      ? await Restaurant.findById(order.restaurant).select("name location").lean()
      : null;

    const job = await DeliveryJob.create({
      order: order._id,
      restaurant: order.restaurant || undefined,
      state: "unassigned",
      promisedBy: order.expectedDeliveryDate || undefined,
      pickup: {
        address: restaurant?.location || "Restaurant pickup",
        city: restaurant?.location || "N/A",
        country: "KE",
      },
      dropoff: {
        address: order.shippingAddress?.street || "Customer address",
        city: order.shippingAddress?.city || "N/A",
        country: order.shippingAddress?.country || "KE",
      },
      notes: order.note || "",
      statusTimeline: [
        {
          state: "unassigned",
          actor: "system",
          note: "Dispatch job created and published to rider pool.",
          at: new Date(),
          metadata: {},
        },
      ],
    });

    await Order.findByIdAndUpdate(order._id, {
      deliveryJob: job._id,
    });

    const dispatchResult = await dispatchOrderReady(job._id.toString());
    if (!dispatchResult || (dispatchResult as any).success === false) {
      await logDispatchEvent({
        deliveryJobId: job._id,
        orderId: order._id,
        eventType: "ops_escalated",
        actor: "system",
        offerVersion: job.currentOfferVersion || 0,
        reason: "Dispatch orchestration failed to initialize",
        metadata: {
          dispatchResult: dispatchResult || null,
        },
      });
    }

    await sendAdminEventNotification({
      title: "Delivery job created",
      description: `Dispatch job created for order ${order.trackingNumber}.`,
      href: "/admin/orders",
      meta: "Awaiting rider acceptance",
      createdAt: new Date().toISOString(),
    });

    revalidatePath("/rider/jobs");
    return { success: true, message: "Delivery job created" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function markDeliveryJobCancelledByOrder(orderId: string) {
  try {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(orderId)) return;

    const job = await DeliveryJob.findOne({
      order: new mongoose.Types.ObjectId(orderId),
      state: { $in: ["unassigned", "offered", "accepted", "picked_up"] },
    });

    if (!job) return;
    const previousState = job.state;

    job.state = "cancelled";
    job.cancelledAt = new Date();
    appendDeliveryJobTimeline({
      job,
      state: "cancelled",
      actor: "system",
      note: "Order was cancelled before completion.",
    });
    await job.save();
    await recordRiderAuditLog({
      riderId: (job.rider as any)?.toString?.() || undefined,
      deliveryJobId: job._id,
      orderId: job.order as any,
      actorType: "system",
      action: "status_transition",
      fromStatus: previousState,
      toStatus: "cancelled",
      reason: "Order was cancelled before completion",
    });

    await logDispatchEvent({
      deliveryJobId: job._id,
      orderId: job.order,
      riderId: job.rider || undefined,
      eventType: "assignment_cancelled",
      actor: "system",
      offerVersion: job.currentOfferVersion || 1,
      reason: "Order cancelled",
    });

    if (job?.rider) {
      await RiderProfile.updateOne(
        { user: job.rider },
        {
          $set: { availability: "idle" },
          $inc: { cancelledJobs: 1 },
        },
      );
    }
  } catch (error) {
    console.error("Non-critical: Failed to cancel delivery job:", error);
  }
}

export async function getRiderJobsDashboard() {
  await connectToDatabase();
  const scope = await getRiderScope();
  const riderObjectId = new mongoose.Types.ObjectId(scope.userId);
  const payoutPolicy = getRiderPayoutPolicy();

  const [profile, availableJobs, myActiveJobs, myRecentJobs, earnings, balance] =
    await Promise.all([
      RiderProfile.findById(scope.riderProfileId).lean(),
      DeliveryJob.find({
        state: "offered",
        rider: riderObjectId,
        offerExpiresAt: { $gt: new Date() },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("order", "trackingNumber status shippingAddress totalPrice")
        .populate("restaurant", "name location")
        .lean(),
      DeliveryJob.find({
        rider: riderObjectId,
        state: { $in: ["accepted", "picked_up"] },
      })
        .sort({ updatedAt: -1 })
        .populate(
          "order",
          "trackingNumber status shippingAddress totalPrice expectedDeliveryDate",
        )
        .populate("restaurant", "name location")
        .lean(),
      DeliveryJob.find({
        rider: riderObjectId,
        state: { $in: ["delivered", "cancelled", "failed"] },
      })
        .sort({ updatedAt: -1 })
        .limit(15)
        .populate("order", "trackingNumber status shippingAddress totalPrice")
        .populate("restaurant", "name location")
        .lean(),
      RiderEarningLedger.aggregate([
        { $match: { rider: riderObjectId } },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$amount" },
          },
        },
      ]),
      RiderBalance.findOne({ rider: riderObjectId }).lean(),
    ]);

  return {
    profile: profile ? JSON.parse(JSON.stringify(profile)) : null,
    availableJobs: JSON.parse(JSON.stringify(availableJobs)),
    myActiveJobs: JSON.parse(JSON.stringify(myActiveJobs)),
    myRecentJobs: JSON.parse(JSON.stringify(myRecentJobs)),
    earnings: JSON.parse(JSON.stringify(earnings)),
    balance: balance
      ? JSON.parse(JSON.stringify(balance))
      : {
          pendingBalance: 0,
          availableBalance: 0,
          reservedBalance: 0,
          lifetimeEarned: 0,
          lifetimePaid: 0,
        },
    payoutPolicy,
  };
}

export async function getRiderDispatchTimeline() {
  await connectToDatabase();
  const scope = await getRiderScope();
  const riderObjectId = new mongoose.Types.ObjectId(scope.userId);

  const [events, jobs, proofs] = await Promise.all([
    DispatchEvent.find({ rider: riderObjectId })
      .sort({ createdAt: -1 })
      .limit(120)
      .populate("order", "trackingNumber status")
      .populate("deliveryJob", "state promisedBy")
      .lean(),
    DeliveryJob.find({ rider: riderObjectId })
      .sort({ updatedAt: -1 })
      .limit(40)
      .populate("order", "trackingNumber status shippingAddress")
      .populate("restaurant", "name")
      .lean(),
    ProofOfDelivery.find({ rider: riderObjectId })
      .sort({ deliveredAt: -1 })
      .limit(40)
      .populate("order", "trackingNumber status shippingAddress")
      .populate("deliveryJob", "state")
      .lean(),
  ]);

  return {
    rider: {
      userId: scope.userId,
      name: scope.userName,
      availability: scope.availability,
      status: scope.riderStatus,
    },
    events: JSON.parse(JSON.stringify(events)),
    jobs: JSON.parse(JSON.stringify(jobs)),
    proofs: JSON.parse(JSON.stringify(proofs)),
  };
}

export async function getAdminDispatchTimeline() {
  await connectToDatabase();
  const session = await getServerSession();
  if (!session?.user || !isAdminRole(session.user.role)) {
    throw new Error("Admin permission required");
  }
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    events,
    proofs,
    jobSummary,
    activeJobs,
    escalatedJobs,
    unassignedJobs,
    delayedJobs,
    riderPositions,
    eligibleRiders,
    recentJobs,
    complaints,
  ] = await Promise.all([
    DispatchEvent.find({})
      .sort({ createdAt: -1 })
      .limit(250)
      .populate("rider", "name email")
      .populate("order", "trackingNumber status")
      .populate("deliveryJob", "state promisedBy")
      .lean(),
    ProofOfDelivery.find({})
      .sort({ deliveredAt: -1 })
      .limit(150)
      .populate("rider", "name email")
      .populate("order", "trackingNumber status shippingAddress")
      .populate("deliveryJob", "state")
      .lean(),
    DeliveryJob.aggregate([
      { $group: { _id: "$state", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    DeliveryJob.find({ state: { $in: ["offered", "accepted", "picked_up"] } })
      .sort({ updatedAt: -1 })
      .limit(80)
      .populate("rider", "name email")
      .populate("order", "trackingNumber status expectedDeliveryDate")
      .lean(),
    DeliveryJob.find({ manualAssignmentRequired: true })
      .sort({ manualEscalatedAt: -1, updatedAt: -1 })
      .limit(60)
      .populate("order", "trackingNumber status expectedDeliveryDate")
      .populate("restaurant", "name location")
      .populate("rider", "name email")
      .lean(),
    DeliveryJob.find({ state: "unassigned" })
      .sort({ updatedAt: -1 })
      .limit(80)
      .populate("order", "trackingNumber status expectedDeliveryDate")
      .populate("restaurant", "name location")
      .lean(),
    DeliveryJob.find({
      state: { $in: ["unassigned", "offered", "accepted", "picked_up"] },
      promisedBy: { $lt: now },
    })
      .sort({ promisedBy: 1, updatedAt: -1 })
      .limit(80)
      .populate("order", "trackingNumber status expectedDeliveryDate")
      .populate("restaurant", "name location")
      .populate("rider", "name email")
      .lean(),
    RiderProfile.find({ status: { $in: ["active", "pending_kyc"] } })
      .select(
        "_id user status availability currentLocation currentHeartbeatAt acceptanceRate completedJobs cancelledJobs rating riskLevel",
      )
      .populate("user", "name email")
      .sort({ updatedAt: -1 })
      .lean(),
    RiderProfile.find({
      status: "active",
      availability: "idle",
      isKycVerified: true,
      "identityVerification.status": "verified",
      "vehicleDocuments.status": "verified",
    })
      .select("_id user vehicleType acceptanceRate rating riskLevel")
      .populate("user", "name email")
      .sort({ acceptanceRate: -1, rating: -1 })
      .lean(),
    DeliveryJob.find({ createdAt: { $gte: last30Days } })
      .select(
        "_id rider order state createdAt acceptedAt pickedUpAt deliveredAt promisedBy cancelledAt failedAt",
      )
      .populate("rider", "name email")
      .populate("order", "trackingNumber status expectedDeliveryDate")
      .lean(),
    SupportTicket.find({ type: "complaint", createdAt: { $gte: last30Days } })
      .select("subject message createdAt")
      .lean(),
  ]);

  const recentDispatchable = recentJobs.filter((job: any) =>
    ["delivered", "failed", "cancelled"].includes(job.state),
  );

  const assignSamples = recentJobs
    .filter((job: any) => job.acceptedAt && job.createdAt)
    .map(
      (job: any) =>
        (new Date(job.acceptedAt).getTime() - new Date(job.createdAt).getTime()) /
        60000,
    )
    .filter((minutes: number) => Number.isFinite(minutes) && minutes >= 0);

  const pickupDelaySamples = recentJobs
    .filter((job: any) => job.acceptedAt && job.pickedUpAt)
    .map(
      (job: any) =>
        (new Date(job.pickedUpAt).getTime() - new Date(job.acceptedAt).getTime()) /
        60000,
    )
    .filter((minutes: number) => Number.isFinite(minutes) && minutes >= 0);

  const deliveryDelaySamples = recentJobs
    .filter((job: any) => job.deliveredAt && job.promisedBy)
    .map(
      (job: any) =>
        (new Date(job.deliveredAt).getTime() - new Date(job.promisedBy).getTime()) /
        60000,
    )
    .filter((minutes: number) => Number.isFinite(minutes));

  const average = (values: number[]) =>
    values.length === 0
      ? 0
      : Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2));

  const deliveredCount = recentDispatchable.filter(
    (job: any) => job.state === "delivered",
  ).length;
  const completionRate =
    recentDispatchable.length === 0
      ? 0
      : Number(((deliveredCount / recentDispatchable.length) * 100).toFixed(2));

  const riderTrackingToIds = new Map<string, Set<string>>();
  for (const job of recentJobs as any[]) {
    const riderId = job?.rider?._id?.toString?.();
    const tracking = String(job?.order?.trackingNumber || "")
      .trim()
      .toLowerCase();
    if (!riderId || !tracking) continue;
    const set = riderTrackingToIds.get(tracking) || new Set<string>();
    set.add(riderId);
    riderTrackingToIds.set(tracking, set);
  }

  const riderComplaintCount = new Map<string, number>();
  for (const complaint of complaints as any[]) {
    const text = `${String(complaint?.subject || "")} ${String(
      complaint?.message || "",
    )}`.toLowerCase();
    for (const [tracking, riderIds] of riderTrackingToIds.entries()) {
      if (!tracking || !text.includes(tracking)) continue;
      for (const riderId of riderIds) {
        riderComplaintCount.set(
          riderId,
          (riderComplaintCount.get(riderId) || 0) + 1,
        );
      }
    }
  }

  const performanceMap = new Map<
    string,
    {
      riderId: string;
      riderName: string;
      riderEmail: string;
      acceptanceRate: number;
      cancellations: number;
      delivered: number;
      onTimeDelivered: number;
      onTimePct: number;
      complaints: number;
      riskLevel: string;
    }
  >();

  for (const profile of riderPositions as any[]) {
    const riderId = profile?.user?._id?.toString?.();
    if (!riderId) continue;
    performanceMap.set(riderId, {
      riderId,
      riderName: profile?.user?.name || "Rider",
      riderEmail: profile?.user?.email || "",
      acceptanceRate: Number(profile.acceptanceRate || 0),
      cancellations: Number(profile.cancelledJobs || 0),
      delivered: 0,
      onTimeDelivered: 0,
      onTimePct: 0,
      complaints: riderComplaintCount.get(riderId) || 0,
      riskLevel: String(profile.riskLevel || "low"),
    });
  }

  for (const job of recentJobs as any[]) {
    const riderId = job?.rider?._id?.toString?.();
    if (!riderId) continue;
    if (!performanceMap.has(riderId)) {
      performanceMap.set(riderId, {
        riderId,
        riderName: job?.rider?.name || "Rider",
        riderEmail: job?.rider?.email || "",
        acceptanceRate: 0,
        cancellations: 0,
        delivered: 0,
        onTimeDelivered: 0,
        onTimePct: 0,
        complaints: riderComplaintCount.get(riderId) || 0,
        riskLevel: "low",
      });
    }

    const entry = performanceMap.get(riderId)!;
    if (job.state === "delivered") {
      entry.delivered += 1;
      if (job.promisedBy && job.deliveredAt) {
        const delayMinutes =
          (new Date(job.deliveredAt).getTime() - new Date(job.promisedBy).getTime()) /
          60000;
        if (delayMinutes <= 0) entry.onTimeDelivered += 1;
      }
    }
  }

  const riderPerformance = Array.from(performanceMap.values()).map((item) => ({
    ...item,
    onTimePct:
      item.delivered > 0
        ? Number(((item.onTimeDelivered / item.delivered) * 100).toFixed(2))
        : 0,
  }));

  riderPerformance.sort(
    (a, b) =>
      b.acceptanceRate - a.acceptanceRate ||
      b.onTimePct - a.onTimePct ||
      a.cancellations - b.cancellations,
  );

  return {
    events: JSON.parse(JSON.stringify(events)),
    proofs: JSON.parse(JSON.stringify(proofs)),
    jobSummary: JSON.parse(JSON.stringify(jobSummary)),
    activeJobs: JSON.parse(JSON.stringify(activeJobs)),
    escalatedJobs: JSON.parse(JSON.stringify(escalatedJobs)),
    unassignedJobs: JSON.parse(JSON.stringify(unassignedJobs)),
    delayedJobs: JSON.parse(JSON.stringify(delayedJobs)),
    riderPositions: JSON.parse(JSON.stringify(riderPositions)),
    eligibleRiders: JSON.parse(JSON.stringify(eligibleRiders)),
    sla: {
      averageAssignMinutes: average(assignSamples),
      averagePickupDelayMinutes: average(pickupDelaySamples),
      averageDeliveryDelayMinutes: average(deliveryDelaySamples),
      completionRate,
      jobsConsidered: recentDispatchable.length,
      delayedJobs: delayedJobs.length,
    },
    riderPerformance: JSON.parse(JSON.stringify(riderPerformance)),
  };
}

export async function assignDeliveryJobManually(
  jobId: string,
  riderUserId: string,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session?.user || !isAdminRole(session.user.role)) {
      throw new Error("Admin permission required");
    }
    assertObjectId(jobId, "delivery job id");
    assertObjectId(riderUserId, "rider user id");

    const riderProfile = await RiderProfile.findOne({
      user: new mongoose.Types.ObjectId(riderUserId),
      status: "active",
      availability: "idle",
      isKycVerified: true,
      "identityVerification.status": "verified",
      "vehicleDocuments.status": "verified",
    })
      .select("_id user")
      .lean();
    if (!riderProfile) {
      throw new Error("Selected rider is not currently eligible for assignment");
    }

    const job = await DeliveryJob.findById(jobId);
    if (!job) throw new Error("Delivery job not found");
    if (["accepted", "picked_up", "delivered", "cancelled", "failed"].includes(job.state)) {
      throw new Error("Delivery job is no longer dispatchable");
    }
    const previousState = job.state;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OFFER_TIMEOUT_MS);
    const nextOfferVersion = Math.max(0, Number(job.currentOfferVersion || 0)) + 1;

    job.state = "offered";
    job.rider = new mongoose.Types.ObjectId(riderUserId);
    job.offeredAt = now;
    job.offerExpiresAt = expiresAt;
    job.currentOfferVersion = nextOfferVersion;
    job.manualAssignmentRequired = false;
    job.manualAssignmentReason = "";
    job.manualEscalatedAt = undefined;
    job.dispatchAttemptCount = Math.max(0, Number(job.dispatchAttemptCount || 0)) + 1;
    job.dispatchAttemptedRiders = Array.from(
      new Set([...(job.dispatchAttemptedRiders || []).map((id) => id.toString()), riderUserId]),
    );
    appendDeliveryJobTimeline({
      job,
      state: "offered",
      actor: "admin",
      note: "Ops manually assigned rider after escalation.",
      metadata: {
        assignedBy: session.user.id,
        riderUserId,
      },
    });
    await job.save();

    await logDispatchEvent({
      deliveryJobId: job._id,
      orderId: job.order,
      riderId: new mongoose.Types.ObjectId(riderUserId),
      eventType: "manual_assigned",
      actor: "admin",
      offerVersion: nextOfferVersion,
      expiresAt,
      reason: "Manual rider assignment from ops console",
      metadata: {
        assignedBy: session.user.id,
      },
    });

    await recordRiderAuditLog({
      riderId: riderUserId,
      deliveryJobId: job._id,
      orderId: job.order as any,
      actorType: "admin",
      actorId: session.user.id,
      action: "admin_override",
      fromStatus: previousState,
      toStatus: "offered",
      reason: "Manual rider assignment override",
      metadata: {
        offerVersion: nextOfferVersion,
      },
    });

    revalidatePath("/admin/rider-dispatch");
    revalidatePath("/rider/jobs");
    return { success: true, message: "Rider manually assigned to delivery offer" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function emergencyCancelDeliveryJob(
  jobId: string,
  reason?: string,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session?.user || !isAdminRole(session.user.role)) {
      throw new Error("Admin permission required");
    }
    assertObjectId(jobId, "delivery job id");

    const job = await DeliveryJob.findById(jobId);
    if (!job) throw new Error("Delivery job not found");
    if (["delivered", "cancelled", "failed"].includes(job.state)) {
      throw new Error(`Cannot emergency-cancel a ${job.state} job`);
    }

    const previousState = job.state;
    const cancelReason =
      String(reason || "").trim() || "Emergency cancellation by ops";

    job.state = "cancelled";
    job.cancelledAt = new Date();
    job.failureReason = cancelReason;
    appendDeliveryJobTimeline({
      job,
      state: "cancelled",
      actor: "admin",
      note: "Ops emergency cancellation executed.",
      metadata: {
        actorId: session.user.id,
        reason: cancelReason,
      },
    });
    await job.save();

    await logDispatchEvent({
      deliveryJobId: job._id,
      orderId: job.order,
      riderId: job.rider || undefined,
      eventType: "assignment_cancelled",
      actor: "admin",
      offerVersion: job.currentOfferVersion || 1,
      reason: cancelReason,
      metadata: {
        emergency: true,
        cancelledBy: session.user.id,
      },
    });

    await recordRiderAuditLog({
      riderId: job.rider?.toString?.() || undefined,
      deliveryJobId: job._id,
      orderId: job.order as any,
      actorType: "admin",
      actorId: session.user.id,
      action: "admin_override",
      fromStatus: previousState,
      toStatus: "cancelled",
      reason: cancelReason,
      metadata: { emergency: true },
    });

    if (job.rider) {
      await RiderProfile.updateOne(
        { user: job.rider },
        {
          $set: { availability: "idle" },
          $inc: { cancelledJobs: 1 },
        },
      );
    }

    const order = await Order.findById(job.order).populate<{
      user: { email?: string; name?: string };
    }>("user", "email name");
    if (order && !order.isDelivered) {
      const message = "Delivery was cancelled by operations for safety reasons.";
      const nextStatus: OrderTrackingStatus = canTransitionOrderStatus(
        order.status,
        "delivery_exception",
      )
        ? "delivery_exception"
        : order.status;

      if (nextStatus !== order.status) {
        order.status = nextStatus;
      }
      appendTrackingHistory(order, {
        status: nextStatus,
        message,
        location: "Operations",
      });
      await order.save();

      await notifyCustomerOrderStatus(order, nextStatus, message);
    }

    revalidatePath("/admin/rider-dispatch");
    revalidatePath("/rider/jobs");
    revalidatePath("/admin/orders");

    return { success: true, message: "Delivery job emergency-cancelled" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function acceptDeliveryJob(jobId: string): Promise<ActionState> {
  try {
    await connectToDatabase();
    assertObjectId(jobId, "delivery job id");
    const scope = await getRiderScope();
    if (scope.riderStatus !== "active") {
      throw new Error("Rider account is not active");
    }
    await ensureRiderComplianceReady(scope.userId);
    if (scope.availability === "offline") {
      throw new Error("Set your availability to online before accepting jobs");
    }

    const riderObjectId = new mongoose.Types.ObjectId(scope.userId);

    const activeJobsCount = await getActiveJobsCountForRider(riderObjectId);
    if (activeJobsCount >= MAX_CONCURRENT_ACTIVE_JOBS) {
      throw new Error("You already have an active delivery job");
    }

    const acceptedJob = await DeliveryJob.findOneAndUpdate(
      {
        _id: jobId,
        state: "offered",
        rider: riderObjectId,
        offerExpiresAt: { $gt: new Date() },
        manualAssignmentRequired: { $ne: true },
      },
      {
        $set: {
          state: "accepted",
          acceptedAt: new Date(),
          offerExpiresAt: undefined,
        },
      },
      { new: true },
    );

    if (!acceptedJob) {
      const existing = await DeliveryJob.findById(jobId).select(
        "rider state offerExpiresAt manualAssignmentRequired",
      );
      if (
        existing &&
        existing.rider?.toString() === scope.userId &&
        existing.state === "accepted"
      ) {
        return { success: true, message: "Delivery job already accepted" };
      }
      if (
        existing &&
        existing.rider?.toString() === scope.userId &&
        existing.state === "offered" &&
        existing.offerExpiresAt &&
        new Date(existing.offerExpiresAt).getTime() <= Date.now()
      ) {
        return {
          success: false,
          message:
            "Offer expired before acceptance. Dispatch fallback will assign the next candidate.",
        };
      }
      if (existing?.manualAssignmentRequired) {
        return {
          success: false,
          message: "Dispatch is escalated to ops for manual assignment.",
        };
      }
      throw new Error("Delivery job is no longer available");
    }

    appendDeliveryJobTimeline({
      job: acceptedJob,
      state: "accepted",
      actor: "rider",
      note: "Rider accepted the delivery offer.",
      metadata: { riderId: scope.userId },
    });
    await acceptedJob.save();

    await logDispatchEvent({
      deliveryJobId: acceptedJob._id,
      orderId: acceptedJob.order,
      riderId: riderObjectId,
      eventType: "offer_accepted",
      actor: "rider",
      offerVersion: acceptedJob.currentOfferVersion || 1,
      metadata: { riderName: scope.userName },
    });
    await recordRiderAuditLog({
      riderId: scope.userId,
      deliveryJobId: acceptedJob._id,
      orderId: acceptedJob.order as any,
      actorType: "rider",
      actorId: scope.userId,
      action: "status_transition",
      fromStatus: "offered",
      toStatus: "accepted",
      reason: "Rider accepted delivery offer",
      metadata: { offerVersion: acceptedJob.currentOfferVersion || 1 },
    });

    const order = await Order.findById(acceptedJob.order).populate<{
      user: { email?: string; name?: string };
    }>("user", "email name");
    if (!order) throw new Error("Linked order not found");
    if (order.status === "cancelled" || order.isDelivered) {
      acceptedJob.state = "cancelled";
      acceptedJob.cancelledAt = new Date();
      acceptedJob.failureReason = "Order no longer available";
      appendDeliveryJobTimeline({
        job: acceptedJob,
        state: "cancelled",
        actor: "system",
        note: "Assignment rolled back because linked order was unavailable.",
      });
      await acceptedJob.save();
      await logDispatchEvent({
        deliveryJobId: acceptedJob._id,
        orderId: acceptedJob.order,
        riderId: riderObjectId,
        eventType: "assignment_cancelled",
        actor: "system",
        offerVersion: acceptedJob.currentOfferVersion || 1,
        reason: "Order no longer available",
      });
      await recordRiderAuditLog({
        riderId: scope.userId,
        deliveryJobId: acceptedJob._id,
        orderId: acceptedJob.order as any,
        actorType: "system",
        action: "status_transition",
        fromStatus: "accepted",
        toStatus: "cancelled",
        reason: "Order no longer available",
      });
      throw new Error("Order is no longer available for delivery");
    }

    order.assignedRider = riderObjectId;
    order.deliveryJob = acceptedJob._id;

    await transitionOrderFromRider({
      order,
      nextStatus: "shipped",
      message: "A rider accepted your delivery and is heading to pickup.",
      riderName: scope.userName,
    });

    await RiderProfile.findByIdAndUpdate(scope.riderProfileId, {
      availability: "on_trip",
      updatedAt: new Date(),
    });

    revalidatePath("/rider/jobs");
    revalidatePath(`/admin/orders/${order._id.toString()}`);
    revalidatePath(`/restaurant-admin/orders/${order._id.toString()}`);
    revalidatePath(`/track/${order.trackingNumber}`);

    return { success: true, message: "Delivery job accepted" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function markPickupCompleted(
  jobId: string,
  location?: string,
): Promise<ActionState & { otp?: string }> {
  try {
    await connectToDatabase();
    assertObjectId(jobId, "delivery job id");
    const scope = await getRiderScope();
    if (scope.riderStatus !== "active") {
      throw new Error("Rider account is not active");
    }

    const job = await DeliveryJob.findOne({
      _id: jobId,
      rider: new mongoose.Types.ObjectId(scope.userId),
      state: "accepted",
    });
    if (!job) throw new Error("Active assigned job not found");

    const order = await Order.findById(job.order).populate<{
      user: { email?: string; name?: string };
    }>("user", "email name");
    if (!order) throw new Error("Linked order not found");
    if (!["shipped", "out_for_delivery"].includes(order.status)) {
      throw new Error(
        `Order status must be shipped before pickup confirmation (current: ${order.status})`,
      );
    }

    const riderProfile = await RiderProfile.findOne({
      user: new mongoose.Types.ObjectId(scope.userId),
    })
      .select("riskScore riskLevel")
      .lean();
    const handoffRisk = evaluateHandoffRisk({
      riderRiskScore: Number(riderProfile?.riskScore || 0),
      orderTotal: Number(order.totalPrice || 0),
      manualAssignment: Boolean(job.manualAssignmentRequired),
    });
    const otp = `${randomInt(100000, 999999)}`;

    job.state = "picked_up";
    job.pickedUpAt = new Date();
    job.handoffRiskScore = handoffRisk.score;
    job.handoffRiskLevel = handoffRisk.level;
    job.handoffRiskSignals = handoffRisk.signals;
    job.otpRequired = handoffRisk.otpRequired || handoffRisk.score >= HIGH_RISK_OTP_THRESHOLD;
    job.otpRequiredReason = handoffRisk.otpReason;
    job.deliveryOtpHash = hashDeliveryOtp(otp);
    job.deliveryOtpGeneratedAt = new Date();
    job.deliveryOtpAttempts = 0;
    appendDeliveryJobTimeline({
      job,
      state: "picked_up",
      actor: "rider",
      note: "Order picked up from restaurant.",
      metadata: {
        otpRequired: job.otpRequired,
        handoffRiskLevel: job.handoffRiskLevel,
        handoffRiskScore: job.handoffRiskScore,
      },
    });
    await job.save();

    await recordRiderAuditLog({
      riderId: scope.userId,
      deliveryJobId: job._id,
      orderId: order._id,
      actorType: "rider",
      actorId: scope.userId,
      action: "status_transition",
      fromStatus: "accepted",
      toStatus: "picked_up",
      reason: "Pickup confirmed by rider",
      metadata: {
        otpRequired: job.otpRequired,
        otpRequiredReason: job.otpRequiredReason,
        handoffRiskScore: job.handoffRiskScore,
        handoffRiskLevel: job.handoffRiskLevel,
      },
    });

    await transitionOrderFromRider({
      order,
      nextStatus: "out_for_delivery",
      message:
        "Your order has been picked up and is now out for delivery. Share delivery OTP with the rider upon handoff.",
      riderName: scope.userName,
      location,
    });

    revalidatePath("/rider/jobs");
    revalidatePath(`/track/${order.trackingNumber}`);

    return {
      success: true,
      message: job.otpRequired
        ? `Pickup confirmed. High-risk handoff OTP: ${otp}`
        : `Pickup confirmed. OTP generated: ${otp}`,
      otp,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function completeDeliveryJob(
  jobId: string,
  otp: string,
  location?: string,
  proof?: CompletionProofInput,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    assertObjectId(jobId, "delivery job id");
    const scope = await getRiderScope();
    if (scope.riderStatus !== "active") {
      throw new Error("Rider account is not active");
    }
    const trimmedOtp = otp.trim();
    const normalizedProof = normalizeCompletionProof(proof);

    const job = await DeliveryJob.findOne({
      _id: jobId,
      rider: new mongoose.Types.ObjectId(scope.userId),
      state: "picked_up",
    }).select("+deliveryOtpHash +deliveryOtpGeneratedAt");
    if (!job) throw new Error("Picked-up job not found");
    const otpRequired = Boolean(job.otpRequired || job.handoffRiskLevel === "high");
    const shouldVerifyOtp = otpRequired || trimmedOtp.length > 0;
    if (shouldVerifyOtp && !/^\d{6}$/.test(trimmedOtp)) {
      throw new Error("OTP must be a 6-digit code");
    }
    if (otpRequired && !trimmedOtp) {
      throw new Error("OTP is required for high-risk handoff");
    }

    let otpVerified = false;
    if (shouldVerifyOtp) {
      if (!job.deliveryOtpHash || !job.deliveryOtpGeneratedAt) {
        throw new Error("Delivery OTP is missing or expired");
      }

      const otpAgeMs = Date.now() - new Date(job.deliveryOtpGeneratedAt).getTime();
      if (otpAgeMs > DELIVERY_OTP_EXPIRY_MS) {
        job.state = "failed";
        job.failedAt = new Date();
        job.failureReason = "Delivery OTP expired";
        job.deliveryOtpHash = undefined;
        appendDeliveryJobTimeline({
          job,
          state: "failed",
          actor: "system",
          note: "Delivery failed because OTP expired.",
        });
        await job.save();
        await logDispatchEvent({
          deliveryJobId: job._id,
          orderId: job.order,
          riderId: new mongoose.Types.ObjectId(scope.userId),
          eventType: "assignment_cancelled",
          actor: "system",
          offerVersion: job.currentOfferVersion || 1,
          reason: "Delivery OTP expired",
        });
        await RiderProfile.findByIdAndUpdate(scope.riderProfileId, {
          availability: "idle",
          $inc: { cancelledJobs: 1 },
        });
        await recordRiderAuditLog({
          riderId: scope.userId,
          deliveryJobId: job._id,
          orderId: job.order as any,
          actorType: "system",
          action: "status_transition",
          fromStatus: "picked_up",
          toStatus: "failed",
          reason: "Delivery OTP expired",
        });
        throw new Error("Delivery OTP expired. Regenerate from pickup step.");
      }
      if ((job.deliveryOtpAttempts || 0) >= MAX_DELIVERY_OTP_ATTEMPTS) {
        throw new Error(
          "Maximum OTP attempts reached. Contact support for manual resolution.",
        );
      }

      const isOtpValid = job.deliveryOtpHash === hashDeliveryOtp(trimmedOtp);
      if (!isOtpValid) {
        job.deliveryOtpAttempts = (job.deliveryOtpAttempts || 0) + 1;
        await job.save();
        if (job.deliveryOtpAttempts >= MAX_DELIVERY_OTP_ATTEMPTS) {
          job.state = "failed";
          job.failedAt = new Date();
          job.failureReason = "Maximum OTP attempts exceeded";
          job.deliveryOtpHash = undefined;
          appendDeliveryJobTimeline({
            job,
            state: "failed",
            actor: "system",
            note: "Delivery failed due to OTP retry limit.",
          });
          await job.save();
          await logDispatchEvent({
            deliveryJobId: job._id,
            orderId: job.order,
            riderId: new mongoose.Types.ObjectId(scope.userId),
            eventType: "assignment_cancelled",
            actor: "system",
            offerVersion: job.currentOfferVersion || 1,
            reason: "Maximum OTP attempts exceeded",
          });
          await RiderProfile.findByIdAndUpdate(scope.riderProfileId, {
            availability: "idle",
            $inc: { cancelledJobs: 1 },
          });
          await recordRiderAuditLog({
            riderId: scope.userId,
            deliveryJobId: job._id,
            orderId: job.order as any,
            actorType: "system",
            action: "status_transition",
            fromStatus: "picked_up",
            toStatus: "failed",
            reason: "Maximum OTP attempts exceeded",
          });
          throw new Error(
            "Maximum OTP attempts exceeded. Job marked for manual review.",
          );
        }
        throw new Error("Invalid delivery OTP");
      }
      otpVerified = true;
    }

    job.state = "delivered";
    job.deliveredAt = new Date();
    job.deliveryOtpHash = undefined;
    appendDeliveryJobTimeline({
      job,
      state: "delivered",
      actor: "rider",
      note: "Delivery completed after OTP verification.",
    });
    await job.save();

    const order = await Order.findById(job.order).populate<{
      user: { email?: string; name?: string };
    }>("user", "email name");
    if (!order) throw new Error("Linked order not found");
    if (!["out_for_delivery", "shipped"].includes(order.status)) {
      throw new Error(
        `Order is not ready for completion (current: ${order.status})`,
      );
    }

    await transitionOrderFromRider({
      order,
      nextStatus: "delivered",
      message: "Order delivered successfully to customer.",
      riderName: scope.userName,
      location,
    });

    const resolvedVerificationMethod = normalizedProof.signatureUrl
      ? "hybrid"
      : "photo";
    const proofRecord = await ProofOfDelivery.findOneAndUpdate(
      { deliveryJob: job._id },
      {
        $set: {
          order: order._id,
          rider: new mongoose.Types.ObjectId(scope.userId),
          verificationMethod: resolvedVerificationMethod,
          otpVerified,
          otpMasked: otpVerified ? maskOtp(trimmedOtp) : "",
          signatureUrl: normalizedProof.signatureUrl || "",
          photoUrls: normalizedProof.photoUrls,
          geotag: normalizedProof.geotag,
          recipientName: normalizedProof.recipientName,
          note: normalizedProof.note,
          deliveredAt: job.deliveredAt,
          capturedAt: new Date(),
          clientCapturedAt: normalizedProof.clientCapturedAt,
          metadata: {
            deliveryLocationLabel: location || "",
            trackingNumber: order.trackingNumber,
            otpRequired: Boolean(job.otpRequired),
            handoffRiskLevel: job.handoffRiskLevel || "low",
            handoffRiskScore: Number(job.handoffRiskScore || 0),
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    job.proofOfDelivery = proofRecord._id;
    await job.save();

    await recordRiderAuditLog({
      riderId: scope.userId,
      deliveryJobId: job._id,
      orderId: order._id,
      actorType: "rider",
      actorId: scope.userId,
      action: "status_transition",
      fromStatus: "picked_up",
      toStatus: "delivered",
      reason: "Delivery completed",
      metadata: {
        otpRequired: Boolean(job.otpRequired),
        otpVerified,
        handoffRiskLevel: job.handoffRiskLevel || "low",
        handoffRiskScore: Number(job.handoffRiskScore || 0),
      },
    });

    await recordRiderCompletedJobEarning({
      riderId: scope.userId,
      deliveryJobId: job._id.toString(),
      trackingNumber: order.trackingNumber,
      amount: Math.max(0, Number(order.shippingPrice || 0)),
      acceptedAt: job.acceptedAt || null,
      deliveredAt: job.deliveredAt || new Date(),
      otpAttempts: job.deliveryOtpAttempts || 0,
      geotagAccuracyM: normalizedProof.geotag?.accuracyM,
    });

    await RiderProfile.findByIdAndUpdate(scope.riderProfileId, {
      availability: "idle",
      $inc: { completedJobs: 1 },
    });

    revalidatePath("/rider/jobs");
    revalidatePath(`/track/${order.trackingNumber}`);
    revalidatePath(`/admin/orders/${order._id.toString()}`);
    revalidatePath(`/restaurant-admin/orders/${order._id.toString()}`);

    return { success: true, message: "Delivery marked as completed" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function submitRiderLocationPing(input: {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  battery?: number;
  deliveryJobId?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  try {
    await connectToDatabase();
    const scope = await getRiderScope();

    if (
      !Number.isFinite(input.lat) ||
      !Number.isFinite(input.lng) ||
      input.lat < -90 ||
      input.lat > 90 ||
      input.lng < -180 ||
      input.lng > 180
    ) {
      throw new Error("Invalid coordinates");
    }
    if (
      input.speed !== undefined &&
      (!Number.isFinite(input.speed) || input.speed < 0 || input.speed > 180)
    ) {
      throw new Error("Invalid speed value");
    }
    if (
      input.heading !== undefined &&
      (!Number.isFinite(input.heading) || input.heading < 0 || input.heading > 360)
    ) {
      throw new Error("Invalid heading value");
    }
    if (
      input.battery !== undefined &&
      (!Number.isFinite(input.battery) || input.battery < 0 || input.battery > 100)
    ) {
      throw new Error("Invalid battery value");
    }

    const riderObjectId = new mongoose.Types.ObjectId(scope.userId);
    const normalizedFingerprint = String(input.deviceFingerprint || "").trim();
    if (normalizedFingerprint) {
      const deviceFingerprintHash = hashSecuritySignal(normalizedFingerprint);
      const now = new Date();
      const existingBinding = await RiderDeviceBinding.findOne({
        rider: riderObjectId,
        deviceFingerprintHash,
      })
        .select("_id")
        .lean();

      if (existingBinding?._id) {
        await RiderDeviceBinding.updateOne(
          { _id: existingBinding._id },
          {
            $set: {
              lastSeenAt: now,
              userAgent: String(input.userAgent || "").slice(0, 500),
              ipHash: hashSecuritySignal(input.ipAddress),
            },
            $inc: { seenCount: 1 },
          },
        );
      } else {
        await RiderDeviceBinding.create({
          rider: riderObjectId,
          deviceFingerprintHash,
          firstSeenAt: now,
          lastSeenAt: now,
          seenCount: 1,
          userAgent: String(input.userAgent || "").slice(0, 500),
          ipHash: hashSecuritySignal(input.ipAddress),
        });

        await recordRiderAuditLog({
          riderId: scope.userId,
          actorType: "rider",
          actorId: scope.userId,
          action: "device_binding",
          reason: "New rider device fingerprint bound",
        });
      }

      const [sharedRiderIds, knownDeviceCount, profileForRisk] = await Promise.all([
        RiderDeviceBinding.distinct("rider", { deviceFingerprintHash }),
        RiderDeviceBinding.countDocuments({ rider: riderObjectId }),
        RiderProfile.findOne({ user: riderObjectId })
          .select("isKycVerified riskScore riskLevel")
          .lean(),
      ]);

      const risk = evaluateRiderDeviceRisk({
        sharedRiderCount: sharedRiderIds.length,
        knownDeviceCount,
        riderKycVerified: Boolean(profileForRisk?.isKycVerified),
      });

      const previousScore = Number(profileForRisk?.riskScore || 0);
      const previousLevel = String(profileForRisk?.riskLevel || "low");
      await RiderProfile.updateOne(
        { user: riderObjectId },
        {
          $set: {
            riskScore: risk.score,
            riskLevel: risk.level,
            riskFlags: risk.flags,
            lastRiskEvaluatedAt: now,
          },
        },
      );

      if (previousScore !== risk.score || previousLevel !== risk.level) {
        await recordRiderAuditLog({
          riderId: scope.userId,
          actorType: "system",
          action: "risk_score_update",
          reason: "Device anomaly risk score updated",
          metadata: {
            sharedRiderCount: sharedRiderIds.length,
            knownDeviceCount,
            previousScore,
            nextScore: risk.score,
            previousLevel,
            nextLevel: risk.level,
            flags: risk.flags,
          },
        });
      }
    }

    let deliveryJobId: mongoose.Types.ObjectId | undefined;
    let deliveryJob: any = null;
    let orderForJob: any = null;
    if (input.deliveryJobId) {
      if (!mongoose.Types.ObjectId.isValid(input.deliveryJobId)) {
        throw new Error("Invalid delivery job id");
      }
      deliveryJob = await DeliveryJob.findOne({
        _id: new mongoose.Types.ObjectId(input.deliveryJobId),
        rider: riderObjectId,
        state: { $in: ACTIVE_JOB_STATES },
      }).populate("order", "trackingNumber expectedDeliveryDate");
      if (!deliveryJob) throw new Error("Delivery job not active for rider");
      deliveryJobId = deliveryJob._id as mongoose.Types.ObjectId;
      orderForJob = deliveryJob.order;
    }

    const now = new Date();
    const latestSnapshot = await RiderLocationPing.findOne({
      rider: riderObjectId,
      ...(deliveryJobId
        ? { deliveryJob: deliveryJobId }
        : { deliveryJob: { $exists: false } }),
    })
      .sort({ capturedAt: -1 })
      .lean();

    let routeDeviationM: number | undefined;
    let etaDriftMinutes: number | undefined;
    const alertFlags: string[] = [];

    if (deliveryJob) {
      const hasPrevious =
        latestSnapshot &&
        Number.isFinite(latestSnapshot.lat) &&
        Number.isFinite(latestSnapshot.lng);
      const movedDistanceKm = hasPrevious
        ? haversineKm(
            Number(latestSnapshot.lat),
            Number(latestSnapshot.lng),
            input.lat,
            input.lng,
          )
        : 0;

      if (movedDistanceKm >= IDLE_MOVEMENT_RESET_KM) {
        deliveryJob.lastMovementAt = now;
      }

      const idleAnchor = new Date(
        deliveryJob.lastMovementAt ||
          deliveryJob.pickedUpAt ||
          deliveryJob.acceptedAt ||
          deliveryJob.updatedAt ||
          now,
      );
      const idleMs = now.getTime() - idleAnchor.getTime();
      if (
        movedDistanceKm < IDLE_MOVEMENT_RESET_KM &&
        idleMs >= IDLE_ALERT_THRESHOLD_MS &&
        shouldEmitAlert(deliveryJob.lastIdleAlertAt)
      ) {
        alertFlags.push("idle");
        deliveryJob.lastIdleAlertAt = now;
        await logDispatchEvent({
          deliveryJobId: deliveryJob._id,
          orderId: deliveryJob.order?._id || deliveryJob.order,
          riderId: riderObjectId,
          eventType: "rider_idle_alert",
          actor: "system",
          offerVersion: deliveryJob.currentOfferVersion || 1,
          reason: "Rider appears idle for longer than threshold",
          metadata: {
            idleMinutes: Number((idleMs / 60000).toFixed(2)),
            thresholdMinutes: IDLE_ALERT_THRESHOLD_MS / 60000,
          },
        });
      }

      const target =
        deliveryJob.state === "accepted" ? deliveryJob.pickup : deliveryJob.dropoff;
      if (
        Number.isFinite(target?.lat) &&
        Number.isFinite(target?.lng)
      ) {
        const distanceToTargetKm = haversineKm(
          input.lat,
          input.lng,
          Number(target.lat),
          Number(target.lng),
        );
        routeDeviationM = Number((distanceToTargetKm * 1000).toFixed(1));

        const previousDistanceToTargetKm =
          hasPrevious &&
          Number.isFinite(target?.lat) &&
          Number.isFinite(target?.lng)
            ? haversineKm(
                Number(latestSnapshot.lat),
                Number(latestSnapshot.lng),
                Number(target.lat),
                Number(target.lng),
              )
            : undefined;

        const offRouteThreshold =
          deliveryJob.state === "accepted"
            ? OFF_ROUTE_PICKUP_THRESHOLD_KM
            : OFF_ROUTE_DROPOFF_THRESHOLD_KM;
        const movingAway =
          previousDistanceToTargetKm !== undefined &&
          distanceToTargetKm - previousDistanceToTargetKm >= 0.25;

        if (
          distanceToTargetKm > offRouteThreshold &&
          (movingAway || deliveryJob.state === "picked_up") &&
          shouldEmitAlert(deliveryJob.lastOffRouteAlertAt)
        ) {
          alertFlags.push("off_route");
          deliveryJob.lastOffRouteAlertAt = now;
          await logDispatchEvent({
            deliveryJobId: deliveryJob._id,
            orderId: deliveryJob.order?._id || deliveryJob.order,
            riderId: riderObjectId,
            eventType: "off_route_alert",
            actor: "system",
            offerVersion: deliveryJob.currentOfferVersion || 1,
            reason: "Rider appears off-route from destination corridor",
            metadata: {
              distanceToTargetKm: Number(distanceToTargetKm.toFixed(3)),
              thresholdKm: offRouteThreshold,
              state: deliveryJob.state,
            },
          });
        }

        const expectedAtRaw = deliveryJob.promisedBy || orderForJob?.expectedDeliveryDate;
        if (expectedAtRaw) {
          const etaMinutes = estimateEtaMinutes(
            distanceToTargetKm,
            toSpeedKmh(input.speed),
          );
          const predictedArrival = new Date(now.getTime() + etaMinutes * 60 * 1000);
          const expectedAt = new Date(expectedAtRaw);
          etaDriftMinutes = Number(
            ((predictedArrival.getTime() - expectedAt.getTime()) / 60000).toFixed(2),
          );
          if (
            etaDriftMinutes >= ETA_DRIFT_THRESHOLD_MINUTES &&
            shouldEmitAlert(deliveryJob.lastEtaDriftAlertAt)
          ) {
            alertFlags.push("eta_drift");
            deliveryJob.lastEtaDriftAlertAt = now;
            await logDispatchEvent({
              deliveryJobId: deliveryJob._id,
              orderId: deliveryJob.order?._id || deliveryJob.order,
              riderId: riderObjectId,
              eventType: "eta_drift_alert",
              actor: "system",
              offerVersion: deliveryJob.currentOfferVersion || 1,
              reason: "Predicted ETA drift exceeded threshold",
              metadata: {
                etaDriftMinutes,
                thresholdMinutes: ETA_DRIFT_THRESHOLD_MINUTES,
                expectedAt: expectedAt.toISOString(),
                predictedArrival: predictedArrival.toISOString(),
              },
            });
          }
        }
      }

      await deliveryJob.save();

      if (alertFlags.length > 0 && orderForJob?.trackingNumber) {
        await sendAdminEventNotification({
          title: "Rider tracking alert",
          description: `Tracking alert (${alertFlags.join(", ")}) for ${orderForJob.trackingNumber}.`,
          href: "/admin/rider-dispatch",
          meta: "Live dispatch monitor",
          createdAt: now.toISOString(),
        });
      }
    }

    const canCreateNewSnapshot =
      !latestSnapshot ||
      now.getTime() - new Date(latestSnapshot.capturedAt).getTime() >=
        LOCATION_SNAPSHOT_MIN_INTERVAL_MS;

    if (canCreateNewSnapshot) {
      await RiderLocationPing.create({
        rider: riderObjectId,
        deliveryJob: deliveryJobId,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        heading: input.heading,
        battery: input.battery,
        routeDeviationM,
        etaDriftMinutes,
        alertFlags,
        sampleCount: 1,
        capturedAt: now,
      });
    } else if (
      latestSnapshot &&
      now.getTime() - new Date(latestSnapshot.capturedAt).getTime() <=
        LOCATION_COMPRESSION_WINDOW_MS
    ) {
      await RiderLocationPing.updateOne(
        { _id: latestSnapshot._id },
        {
          $set: {
            lat: input.lat,
            lng: input.lng,
            speed: input.speed,
            heading: input.heading,
            battery: input.battery,
            routeDeviationM,
            etaDriftMinutes,
            alertFlags,
            capturedAt: now,
          },
          $inc: { sampleCount: 1 },
        },
      );
    } else {
      await RiderLocationPing.create({
        rider: riderObjectId,
        deliveryJob: deliveryJobId,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        heading: input.heading,
        battery: input.battery,
        routeDeviationM,
        etaDriftMinutes,
        alertFlags,
        sampleCount: 1,
        capturedAt: now,
      });
    }

    await RiderProfile.findByIdAndUpdate(scope.riderProfileId, {
      currentLocation: {
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        heading: input.heading,
        updatedAt: now,
      },
      currentHeartbeatAt: now,
    });

    return { success: true, message: "Location updated" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
