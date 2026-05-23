"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connectToDatabase } from "../db";
import RiderProfile from "../db/models/rider-profile.model";
import User from "../db/models/user.model";
import DeliveryJob from "../db/models/delivery-job.model";
import RiderBalance from "../db/models/rider-balance.model";
import RiderDeviceBinding from "../db/models/rider-device-binding.model";
import RiderLocationPing from "../db/models/rider-location-ping.model";
import RiderPayout from "../db/models/rider-payout.model";
import RiderEarningLedger from "../db/models/rider-earning-ledger.model";
import ProofOfDelivery from "../db/models/proof-of-delivery.model";
import RiderAuditLog from "../db/models/rider-audit-log.model";
import {
  RiderRegistrationInputSchema,
  RiderProfileUpdateSchema,
} from "../validator";
import { formatError, flattenZodErrors } from "../utils";
import type { ActionState } from "@/types/action-state";
import { getServerSession } from "../get-session";
import {
  canStartRiderOnboarding,
  isAdminRole,
  parseRoleTokens,
} from "../dashboard-access";
import { recordRiderAuditLog } from "../rider-audit";

// ─── Helpers ────────────────────────────────────────────────────

function assertObjectId(value: string, label: string) {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error(`Invalid ${label}`);
  }
}

const ACTIVE_DELIVERY_STATES = ["accepted", "picked_up"] as const;

function normalizeModerationReason(value: string, label = "Reason") {
  const trimmed = String(value || "").trim();
  if (trimmed.length < 5) {
    throw new Error(`${label} must be at least 5 characters`);
  }
  if (trimmed.length > 300) {
    throw new Error(`${label} must be at most 300 characters`);
  }
  return trimmed;
}

function roleWithoutRider(role?: string | null) {
  const next = parseRoleTokens(role).filter((token) => token !== "RIDER");
  if (next.length === 0) return "USER";
  return next.join(" ");
}

export type RiderRegistrationStatusResponse =
  | {
      exists: false;
      authenticated: boolean;
    }
  | {
      exists: true;
      authenticated: true;
      status: string;
      fullName: string;
      phone: string;
      location: string;
      vehicleType: string;
      capacity: number;
      plateNumber: string;
      licenseNumber: string;
      nationalIdNumber: string;
      identityDocumentUrl: string;
      selfieUrl: string;
      vehicleLicenseUrl: string;
      vehicleInsuranceUrl: string;
      vehiclePhotoUrl: string;
      identityVerificationStatus: string;
      vehicleDocumentsStatus: string;
      kycVerifiedAt?: string;
      adminNote: string;
      isKycVerified: boolean;
      role: string;
    };

// ─── Rider Registration Routes ───────────────────────────────────

export async function getRiderRegistrationStatus(): Promise<RiderRegistrationStatusResponse> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session?.user) {
      return { exists: false, authenticated: false };
    }

    // Allow signed-in users to start rider onboarding, not only existing rider roles.
    if (!canStartRiderOnboarding(session.user.role)) {
      return { exists: false, authenticated: false };
    }

    const profile = await RiderProfile.findOne({
      user: session.user.id,
    }).lean();

    if (!profile) {
      return { exists: false, authenticated: true };
    }

    return {
      exists: true,
      authenticated: true,
      status: profile.status,
      fullName: (profile as any).fullName || "",
      phone: profile.phone || "",
      location: (profile as any).location || "",
      vehicleType: profile.vehicleType,
      capacity: profile.capacity || 1,
      plateNumber: profile.plateNumber || "",
      licenseNumber: (profile as any).licenseNumber || "",
      nationalIdNumber: (profile as any).nationalIdNumber || "",
      identityDocumentUrl: (profile as any).identityDocumentUrl || "",
      selfieUrl: (profile as any).selfieUrl || "",
      vehicleLicenseUrl: (profile as any).vehicleLicenseUrl || "",
      vehicleInsuranceUrl: (profile as any).vehicleInsuranceUrl || "",
      vehiclePhotoUrl: (profile as any).vehiclePhotoUrl || "",
      identityVerificationStatus: "missing",
      vehicleDocumentsStatus: "missing",
      kycVerifiedAt: profile.kycVerifiedAt?.toISOString(),
      adminNote: profile.kycRejectedReason || "",
      isKycVerified: profile.isKycVerified,
      role: profile.role || "rider",
    } as any;
  } catch (error) {
    console.error("Error getting rider registration status:", error);
    return { exists: false, authenticated: false };
  }
}

export async function submitRiderRegistration(
  data: unknown,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    if (!canStartRiderOnboarding(session.user.role)) {
      throw new Error("Unauthorized");
    }

    const validated = RiderRegistrationInputSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }

    const payload = validated.data;

    // Sanitize
    const fullName = payload.fullName.trim();
    const phone = payload.phone.trim();
    const location = payload.location.trim();
    const licenseNumber = payload.licenseNumber.trim();
    const nationalIdNumber = payload.nationalIdNumber.trim();

    // If website field was submitted as spam, reject
    if ((payload.website || "").trim().length > 0) {
      throw new Error("Unable to process this registration request.");
    }

    // Find existing profile (for conflict checks below)
    const existingProfileForConflict = await RiderProfile.findOne({
      user: session.user.id,
    });
    const existingProfile = await RiderProfile.findOne({
      user: session.user.id,
    });

    // Update user name
    await User.findByIdAndUpdate(session.user.id, {
      name: fullName,
    });

    if (existingProfile) {
      // Update existing
      existingProfile.set({
        fullName,
        phone,
        location,
        vehicleType: payload.vehicleType,
        capacity: payload.capacity,
        plateNumber: payload.plateNumber || "",
        licenseNumber,
        nationalIdNumber,
        identityDocumentUrl: payload.identityDocumentUrl || "",
        selfieUrl: payload.selfieUrl || "",
        vehicleLicenseUrl: payload.vehicleLicenseUrl || "",
        vehicleInsuranceUrl: payload.vehicleInsuranceUrl || "",
        vehiclePhotoUrl: payload.vehiclePhotoUrl || "",
        identityVerification: {
          documentUrl: payload.identityDocumentUrl || "",
          selfieUrl: payload.selfieUrl || "",
          status: "pending",
          rejectionReason: "",
        },
        vehicleDocuments: {
          licenseUrl: payload.vehicleLicenseUrl || "",
          insuranceUrl: payload.vehicleInsuranceUrl || "",
          vehiclePhotoUrl: payload.vehiclePhotoUrl || "",
          status: "pending",
          rejectionReason: "",
        },
        status: "pending_kyc",
        isKycVerified: false,
        kycVerifiedAt: undefined,
        kycRejectedReason: "",
      });
      await existingProfile.save();

      revalidatePath("/rider/profile");
      return {
        success: true,
        message:
          "Registration updated. Awaiting admin KYC review before you can go online.",
      };
    }

    // Create new profile
    await RiderProfile.create({
      user: session.user.id,
      fullName,
      phone,
      location,
      vehicleType: payload.vehicleType,
      capacity: payload.capacity,
      plateNumber: payload.plateNumber || "",
      licenseNumber,
      nationalIdNumber,
      identityDocumentUrl: payload.identityDocumentUrl || "",
      selfieUrl: payload.selfieUrl || "",
      vehicleLicenseUrl: payload.vehicleLicenseUrl || "",
      vehicleInsuranceUrl: payload.vehicleInsuranceUrl || "",
      vehiclePhotoUrl: payload.vehiclePhotoUrl || "",
      identityVerification: {
        documentUrl: payload.identityDocumentUrl || "",
        selfieUrl: payload.selfieUrl || "",
        status: "pending",
        rejectionReason: "",
      },
      vehicleDocuments: {
        licenseUrl: payload.vehicleLicenseUrl || "",
        insuranceUrl: payload.vehicleInsuranceUrl || "",
        vehiclePhotoUrl: payload.vehiclePhotoUrl || "",
        status: "pending",
        rejectionReason: "",
      },
      status: "pending_kyc",
      availability: "offline",
      isKycVerified: false,
      riskScore: 0,
      riskLevel: "low",
      riskFlags: [],
      completedJobs: 0,
      cancelledJobs: 0,
      acceptanceRate: 0,
      rating: 5,
    });

    revalidatePath("/rider/profile");
    return {
      success: true,
      message:
        "Registration submitted. Awaiting admin KYC review before you can go online.",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getRiderProfile(): Promise<
  ActionState & {
    data?: {
      fullName: string;
      phone: string;
      location: string;
      vehicleType: string;
      capacity: number;
      plateNumber: string;
      licenseNumber: string;
      nationalIdNumber: string;
      identityDocumentUrl: string;
      selfieUrl: string;
      vehicleLicenseUrl: string;
      vehicleInsuranceUrl: string;
      vehiclePhotoUrl: string;
      status: string;
      availability: string;
      isKycVerified: boolean;
      kycRejectedReason: string;
      kycVerifiedAt?: string;
       completedJobs: number;
       rating: number;
       acceptanceRate: number;
     };
  }
> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const profile = await RiderProfile.findOne({
      user: session.user.id,
    })
      .select(
        "fullName phone location vehicleType capacity plateNumber licenseNumber nationalIdNumber identityDocumentUrl selfieUrl vehicleLicenseUrl vehicleInsuranceUrl vehiclePhotoUrl identityVerification vehicleDocuments status availability isKycVerified completedJobs rating acceptanceRate kycRejectedReason kycVerifiedAt role",
      )
      .lean();

    if (!profile) {
      return { success: false, message: "Rider profile not found" };
    }

    return {
      success: true,
      message: "Profile fetched",
      data: {
        fullName: (profile as any).fullName || "",
        phone: profile.phone || "",
        location: (profile as any).location || "",
        vehicleType: profile.vehicleType,
        capacity: profile.capacity || 1,
        plateNumber: profile.plateNumber || "",
        licenseNumber: (profile as any).licenseNumber || "",
        nationalIdNumber: (profile as any).nationalIdNumber || "",
        identityDocumentUrl: (profile as any).identityDocumentUrl || "",
        selfieUrl: (profile as any).selfieUrl || "",
        vehicleLicenseUrl: (profile as any).vehicleLicenseUrl || "",
        vehicleInsuranceUrl: (profile as any).vehicleInsuranceUrl || "",
        vehiclePhotoUrl: (profile as any).vehiclePhotoUrl || "",
        status: profile.status,
        availability: profile.availability,
        isKycVerified: profile.isKycVerified,
        kycRejectedReason: profile.kycRejectedReason || "",
        kycVerifiedAt: profile.kycVerifiedAt?.toISOString(),
        completedJobs: profile.completedJobs || 0,
        rating: profile.rating || 5,
        acceptanceRate: profile.acceptanceRate || 0,
      },
    } as any;
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateRiderProfile(
  data: unknown,
): Promise<ActionState> {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    if (!canStartRiderOnboarding(session.user.role)) {
      throw new Error("Unauthorized");
    }

    const validated = RiderProfileUpdateSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }

    const updates: Record<string, any> = {};
    const payload = validated.data;

    if (payload.fullName) {
      updates.fullName = payload.fullName;
      await User.findByIdAndUpdate(session.user.id, {
        name: payload.fullName,
      });
    }
    if (payload.phone) updates.phone = payload.phone;
    if (payload.location) updates.location = payload.location;
    if (payload.vehicleType) updates.vehicleType = payload.vehicleType;
    if (payload.capacity) updates.capacity = payload.capacity;
    if (payload.plateNumber !== undefined)
      updates.plateNumber = payload.plateNumber;
    if (payload.licenseNumber)
      updates.licenseNumber = payload.licenseNumber;

    if (Object.keys(updates).length === 0) {
      return { success: true, message: "No changes detected" };
    }

    await RiderProfile.findOneAndUpdate(
      { user: session.user.id },
      { $set: updates },
    );

    revalidatePath("/rider/profile");
    revalidatePath("/rider/admin");
    return { success: true, message: "Profile updated successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function approveRiderByAdmin(input: {
  riderUserId: string;
  approved: boolean;
  rejectionReason?: string;
}): Promise<ActionState> {
  try {
    await connectToDatabase();
    const admin = await getServerSession();
    if (!isAdminRole(admin?.user?.role)) {
      throw new Error("Admin permission required");
    }
    assertObjectId(input.riderUserId, "rider user id");

    const riderObjectId = new mongoose.Types.ObjectId(input.riderUserId);
    const profile = await RiderProfile.findOne({
      user: riderObjectId,
    });
    if (!profile) {
      throw new Error("Rider profile not found");
    }
    if (profile.status === "suspended" && input.approved) {
      throw new Error(
        "This rider is suspended. Reactivate the account before approval.",
      );
    }

    const reason = (input.rejectionReason || "").trim();
    if (!input.approved && !reason) {
      throw new Error("Provide a rejection reason");
    }

    profile.isKycVerified = input.approved;
    profile.kycVerifiedAt = input.approved ? new Date() : undefined;
    profile.kycRejectedReason = input.approved ? "" : reason;
    profile.status = input.approved ? "active" : "pending_kyc";
    if (profile.identityVerification) {
      profile.identityVerification.status = input.approved
        ? "verified"
        : "rejected";
      profile.identityVerification.verifiedAt = input.approved
        ? new Date()
        : undefined;
      profile.identityVerification.rejectionReason = input.approved ? "" : reason;
    }
    if (profile.vehicleDocuments) {
      profile.vehicleDocuments.status = input.approved
        ? "verified"
        : "rejected";
      profile.vehicleDocuments.verifiedAt = input.approved
        ? new Date()
        : undefined;
      profile.vehicleDocuments.rejectionReason = input.approved ? "" : reason;
    }
    profile.availability = input.approved ? "offline" : "offline";
    await profile.save();
    await recordRiderAuditLog({
      riderId: input.riderUserId,
      actorType: "admin",
      actorId: admin.user.id,
      action: "kyc_review",
      fromStatus: input.approved ? "pending_kyc" : "active",
      toStatus: input.approved ? "active" : "pending_kyc",
      reason: input.approved
        ? "Admin approved rider and activated delivery eligibility"
        : reason,
    });

    revalidatePath("/admin/riders");
    revalidatePath(`/admin/riders/${input.riderUserId}`);
    revalidatePath("/rider/profile");
    return {
      success: true,
      message: input.approved
        ? "Rider approved and account activated"
        : "Rider registration rejected",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function suspendRiderByAdmin(input: {
  riderUserId: string;
  reason: string;
}): Promise<ActionState> {
  try {
    await connectToDatabase();
    const admin = await getServerSession();
    if (!isAdminRole(admin?.user?.role)) {
      throw new Error("Admin permission required");
    }

    assertObjectId(input.riderUserId, "rider user id");
    const riderObjectId = new mongoose.Types.ObjectId(input.riderUserId);
    const reason = normalizeModerationReason(input.reason, "Suspension reason");

    const profile = await RiderProfile.findOne({
      user: riderObjectId,
    });
    if (!profile) {
      throw new Error("Rider profile not found");
    }
    if (profile.status === "suspended") {
      return {
        success: true,
        message: "Rider is already suspended",
      };
    }

    const activeJobsCount = await DeliveryJob.countDocuments({
      rider: riderObjectId,
      state: { $in: ACTIVE_DELIVERY_STATES },
    });
    if (activeJobsCount > 0) {
      throw new Error(
        "Cannot suspend rider with active deliveries. Resolve or reassign active jobs first.",
      );
    }

    const previousStatus = profile.status;
    profile.status = "suspended";
    profile.availability = "offline";
    await profile.save();

    await recordRiderAuditLog({
      riderId: input.riderUserId,
      actorType: "admin",
      actorId: admin.user.id,
      action: "admin_override",
      fromStatus: previousStatus,
      toStatus: "suspended",
      reason,
      metadata: {
        activeJobsCount,
      },
    });

    revalidatePath("/admin/riders");
    revalidatePath(`/admin/riders/${input.riderUserId}`);
    revalidatePath("/admin/rider-dispatch");
    revalidatePath("/rider/jobs");
    revalidatePath("/rider/profile");
    return { success: true, message: "Rider suspended successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function reactivateRiderByAdmin(input: {
  riderUserId: string;
  reason?: string;
}): Promise<ActionState> {
  try {
    await connectToDatabase();
    const admin = await getServerSession();
    if (!isAdminRole(admin?.user?.role)) {
      throw new Error("Admin permission required");
    }

    assertObjectId(input.riderUserId, "rider user id");
    const riderObjectId = new mongoose.Types.ObjectId(input.riderUserId);
    const rawReason = String(input.reason || "").trim();
    if (rawReason.length > 300) {
      throw new Error("Reactivation note must be at most 300 characters");
    }

    const profile = await RiderProfile.findOne({
      user: riderObjectId,
    });
    if (!profile) {
      throw new Error("Rider profile not found");
    }
    if (profile.status !== "suspended") {
      return {
        success: true,
        message: "Rider is already active in moderation workflow",
      };
    }

    const hasCompleteKyc =
      profile.isKycVerified &&
      profile.identityVerification?.status === "verified" &&
      profile.vehicleDocuments?.status === "verified";

    const nextStatus = hasCompleteKyc ? "active" : "pending_kyc";
    profile.status = nextStatus;
    profile.availability = "offline";
    await profile.save();

    await recordRiderAuditLog({
      riderId: input.riderUserId,
      actorType: "admin",
      actorId: admin.user.id,
      action: "admin_override",
      fromStatus: "suspended",
      toStatus: nextStatus,
      reason:
        rawReason ||
        (nextStatus === "active"
          ? "Admin reactivated rider account"
          : "Admin lifted suspension and returned rider to pending KYC"),
    });

    revalidatePath("/admin/riders");
    revalidatePath(`/admin/riders/${input.riderUserId}`);
    revalidatePath("/admin/rider-dispatch");
    revalidatePath("/rider/jobs");
    revalidatePath("/rider/profile");
    return {
      success: true,
      message:
        nextStatus === "active"
          ? "Rider reactivated successfully"
          : "Rider reactivated, but still pending KYC verification",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deleteRiderByAdmin(input: {
  riderUserId: string;
  reason: string;
  confirmation: string;
}): Promise<ActionState> {
  try {
    await connectToDatabase();
    const admin = await getServerSession();
    if (!isAdminRole(admin?.user?.role)) {
      throw new Error("Admin permission required");
    }
    if (!admin.user?.id) {
      throw new Error("Admin session is missing actor id");
    }

    assertObjectId(input.riderUserId, "rider user id");
    const riderObjectId = new mongoose.Types.ObjectId(input.riderUserId);

    const reason = normalizeModerationReason(input.reason, "Deletion reason");
    if (String(input.confirmation || "").trim().toUpperCase() !== "DELETE") {
      throw new Error('Type "DELETE" to confirm rider deletion');
    }
    if (admin.user.id === input.riderUserId) {
      throw new Error("You cannot delete your own rider profile");
    }

    const profile = await RiderProfile.findOne({ user: riderObjectId });
    if (!profile) {
      throw new Error("Rider profile not found");
    }

    const [
      activeJobsCount,
      totalJobsCount,
      proofCount,
      payoutCount,
      ledgerCount,
      auditCount,
    ] = await Promise.all([
      DeliveryJob.countDocuments({
        rider: riderObjectId,
        state: { $in: ACTIVE_DELIVERY_STATES },
      }),
      DeliveryJob.countDocuments({ rider: riderObjectId }),
      ProofOfDelivery.countDocuments({ rider: riderObjectId }),
      RiderPayout.countDocuments({ rider: riderObjectId }),
      RiderEarningLedger.countDocuments({ rider: riderObjectId }),
      RiderAuditLog.countDocuments({ rider: riderObjectId }),
    ]);

    if (activeJobsCount > 0) {
      throw new Error(
        "Cannot delete rider with active deliveries. Suspend and resolve deliveries first.",
      );
    }

    // Preserve historical finance/operations records by disallowing destructive deletes.
    if (
      totalJobsCount > 0 ||
      proofCount > 0 ||
      payoutCount > 0 ||
      ledgerCount > 0 ||
      auditCount > 0
    ) {
      throw new Error(
        "Cannot delete rider with historical records. Suspend the rider instead to preserve audit and finance integrity.",
      );
    }

    const user = await User.findById(riderObjectId).select("_id role");
    if (!user) {
      throw new Error("Rider user account not found");
    }

    await recordRiderAuditLog({
      riderId: input.riderUserId,
      actorType: "admin",
      actorId: admin.user.id,
      action: "admin_override",
      fromStatus: profile.status,
      toStatus: "deleted",
      reason,
    });

    await Promise.all([
      RiderProfile.deleteOne({ user: riderObjectId }),
      RiderBalance.deleteOne({ rider: riderObjectId }),
      RiderDeviceBinding.deleteMany({ rider: riderObjectId }),
      RiderLocationPing.deleteMany({ rider: riderObjectId }),
      User.findByIdAndUpdate(riderObjectId, {
        role: roleWithoutRider(user.role),
      }),
    ]);

    revalidatePath("/admin/riders");
    revalidatePath(`/admin/riders/${input.riderUserId}`);
    revalidatePath("/admin/rider-dispatch");
    revalidatePath("/rider/jobs");
    revalidatePath("/rider/profile");
    return {
      success: true,
      message: "Rider profile deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function bulkModerateRidersByAdmin(input: {
  riderUserIds: string[];
  action: "suspend" | "reactivate";
  reason: string;
}): Promise<
  ActionState<{
    requested: number;
    processed: number;
    updated: number;
    skipped: number;
    failed: number;
    failures: Array<{ riderUserId: string; reason: string }>;
  }>
> {
  try {
    await connectToDatabase();
    const admin = await getServerSession();
    if (!isAdminRole(admin?.user?.role)) {
      throw new Error("Admin permission required");
    }
    if (!admin.user?.id) {
      throw new Error("Admin session is missing actor id");
    }

    const reason = normalizeModerationReason(input.reason, "Bulk action reason");
    const normalizedIds = Array.from(
      new Set(
        (input.riderUserIds || [])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );
    if (normalizedIds.length === 0) {
      throw new Error("Select at least one rider");
    }
    if (normalizedIds.length > 100) {
      throw new Error("Bulk rider actions are limited to 100 riders per request");
    }

    const validIds = normalizedIds.filter((id) =>
      /^[0-9a-fA-F]{24}$/.test(id),
    );
    if (validIds.length === 0) {
      throw new Error("No valid rider ids were provided");
    }

    const riderObjectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
    const [profiles, activeJobsByRider] = await Promise.all([
      RiderProfile.find({
        user: { $in: riderObjectIds },
      }),
      DeliveryJob.aggregate([
        {
          $match: {
            rider: { $in: riderObjectIds },
            state: { $in: ACTIVE_DELIVERY_STATES },
          },
        },
        {
          $group: {
            _id: "$rider",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const profileByRiderId = new Map<string, (typeof profiles)[number]>();
    profiles.forEach((profile) => {
      profileByRiderId.set(profile.user.toString(), profile);
    });

    const activeJobsCountByRiderId = new Map<string, number>();
    activeJobsByRider.forEach((entry: any) => {
      activeJobsCountByRiderId.set(String(entry._id), Number(entry.count || 0));
    });

    const failures: Array<{ riderUserId: string; reason: string }> = [];
    let updated = 0;
    let skipped = 0;

    for (const riderUserId of validIds) {
      if (riderUserId === admin.user.id) {
        failures.push({
          riderUserId,
          reason: "Cannot run bulk moderation on your own account",
        });
        continue;
      }

      const profile = profileByRiderId.get(riderUserId);
      if (!profile) {
        failures.push({ riderUserId, reason: "Rider profile not found" });
        continue;
      }

      if (input.action === "suspend") {
        if (profile.status === "suspended") {
          skipped += 1;
          continue;
        }
        const activeJobsCount = activeJobsCountByRiderId.get(riderUserId) || 0;
        if (activeJobsCount > 0) {
          failures.push({
            riderUserId,
            reason: `Rider has ${activeJobsCount} active job(s)`,
          });
          continue;
        }

        const previousStatus = profile.status;
        profile.status = "suspended";
        profile.availability = "offline";
        await profile.save();
        updated += 1;

        await recordRiderAuditLog({
          riderId: riderUserId,
          actorType: "admin",
          actorId: admin.user.id,
          action: "admin_override",
          fromStatus: previousStatus,
          toStatus: "suspended",
          reason,
          metadata: {
            bulk: true,
          },
        });
        continue;
      }

      if (profile.status !== "suspended") {
        skipped += 1;
        continue;
      }

      const hasCompleteKyc =
        profile.isKycVerified &&
        profile.identityVerification?.status === "verified" &&
        profile.vehicleDocuments?.status === "verified";
      const nextStatus = hasCompleteKyc ? "active" : "pending_kyc";
      profile.status = nextStatus;
      profile.availability = "offline";
      await profile.save();
      updated += 1;

      await recordRiderAuditLog({
        riderId: riderUserId,
        actorType: "admin",
        actorId: admin.user.id,
        action: "admin_override",
        fromStatus: "suspended",
        toStatus: nextStatus,
        reason,
        metadata: {
          bulk: true,
        },
      });
    }

    revalidatePath("/admin/riders");
    revalidatePath("/admin/rider-dispatch");
    revalidatePath("/rider/jobs");
    revalidatePath("/rider/profile");

    const processed = validIds.length;
    const failed = failures.length;
    return {
      success: true,
      message: `Bulk ${input.action} completed: ${updated} updated, ${skipped} skipped, ${failed} failed.`,
      data: {
        requested: normalizedIds.length,
        processed,
        updated,
        skipped,
        failed,
        failures: failures.slice(0, 20),
      },
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
