"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../db";
import RiderProfile from "../db/models/rider-profile.model";
import User from "../db/models/user.model";
import {
  RiderRegistrationInputSchema,
  RiderProfileUpdateSchema,
} from "../validator";
import { formatError, flattenZodErrors, toSlug } from "../utils";
import type { ActionState } from "@/types/action-state";
import { getServerSession } from "../get-session";
import { isAdminRole, isRiderRole } from "../dashboard-access";

// ─── Helpers ────────────────────────────────────────────────────

function assertObjectId(value: string, label: string) {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error(`Invalid ${label}`);
  }
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

    // Only RIDER role or ADMIN can check
    if (!isRiderRole(session.user.role) && !isAdminRole(session.user.role)) {
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

    if (!isRiderRole(session.user.role) && !isAdminRole(session.user.role)) {
      throw new Error("Only rider accounts can register");
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

    if (!isRiderRole(session.user.role) && !isAdminRole(session.user.role)) {
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

    const profile = await RiderProfile.findOne({
      user: input.riderUserId,
    });
    if (!profile) {
      throw new Error("Rider profile not found");
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

    revalidatePath("/admin/riders");
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
