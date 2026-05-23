import { Document, Model, Schema, Types, model, models } from "mongoose";

export type RiderProfileStatus = "pending_kyc" | "active" | "suspended";
export type RiderAvailabilityStatus = "offline" | "idle" | "on_trip";

export interface IRiderProfile extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | string;
  status: RiderProfileStatus;
  availability: RiderAvailabilityStatus;
  fullName: string;
  phone: string;
  location: string;
  vehicleType: "bicycle" | "motorbike" | "car" | "van";
  capacity: number;
  plateNumber?: string;
  licenseNumber?: string;
  nationalIdNumber?: string;
  identityDocumentUrl?: string;
  selfieUrl?: string;
  vehicleLicenseUrl?: string;
  vehicleInsuranceUrl?: string;
  vehiclePhotoUrl?: string;
  role: "rider";
  isKycVerified: boolean;
  kycVerifiedAt?: Date;
  kycRejectedReason?: string;
  identityVerification: {
    documentUrl?: string;
    selfieUrl?: string;
    status: "missing" | "pending" | "verified" | "rejected";
    verifiedAt?: Date;
    reviewedBy?: Types.ObjectId | string;
    rejectionReason?: string;
  };
  vehicleDocuments: {
    licenseUrl?: string;
    insuranceUrl?: string;
    vehiclePhotoUrl?: string;
    status: "missing" | "pending" | "verified" | "rejected";
    verifiedAt?: Date;
    reviewedBy?: Types.ObjectId | string;
    rejectionReason?: string;
  };
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  riskFlags: string[];
  lastRiskEvaluatedAt?: Date;
  currentLocation?: {
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    updatedAt: Date;
  };
  currentHeartbeatAt?: Date;
  acceptanceRate: number;
  completedJobs: number;
  cancelledJobs: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const riderProfileSchema = new Schema<IRiderProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["rider"],
      default: "rider",
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending_kyc", "active", "suspended"],
      default: "pending_kyc",
      index: true,
    },
    availability: {
      type: String,
      enum: ["offline", "idle", "on_trip"],
      default: "offline",
      index: true,
    },
    phone: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    vehicleType: {
      type: String,
      enum: ["bicycle", "motorbike", "car", "van"],
      default: "motorbike",
      index: true,
    },
    capacity: { type: Number, default: 1, min: 1 },
    plateNumber: { type: String, trim: true, default: "" },
    licenseNumber: { type: String, trim: true, default: "" },
    nationalIdNumber: { type: String, trim: true, default: "" },
    identityDocumentUrl: { type: String, trim: true, default: "" },
    selfieUrl: { type: String, trim: true, default: "" },
    vehicleLicenseUrl: { type: String, trim: true, default: "" },
    vehicleInsuranceUrl: { type: String, trim: true, default: "" },
    vehiclePhotoUrl: { type: String, trim: true, default: "" },
    isKycVerified: { type: Boolean, default: false, index: true },
    kycVerifiedAt: { type: Date },
    kycRejectedReason: { type: String, trim: true, default: "" },
    identityVerification: {
      documentUrl: { type: String, trim: true, default: "" },
      selfieUrl: { type: String, trim: true, default: "" },
      status: {
        type: String,
        enum: ["missing", "pending", "verified", "rejected"],
        default: "missing",
      },
      verifiedAt: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectionReason: { type: String, trim: true, default: "" },
    },
    vehicleDocuments: {
      licenseUrl: { type: String, trim: true, default: "" },
      insuranceUrl: { type: String, trim: true, default: "" },
      vehiclePhotoUrl: { type: String, trim: true, default: "" },
      status: {
        type: String,
        enum: ["missing", "pending", "verified", "rejected"],
        default: "missing",
      },
      verifiedAt: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectionReason: { type: String, trim: true, default: "" },
    },
    riskScore: { type: Number, default: 0, min: 0, max: 100, index: true },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      index: true,
    },
    riskFlags: { type: [String], default: [] },
    lastRiskEvaluatedAt: { type: Date },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      speed: { type: Number },
      heading: { type: Number },
      updatedAt: { type: Date },
    },
    currentHeartbeatAt: { type: Date, index: true },
    acceptanceRate: { type: Number, default: 0, min: 0, max: 100 },
    completedJobs: { type: Number, default: 0, min: 0 },
    cancelledJobs: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 5, min: 0, max: 5 },
  },
  { timestamps: true },
);

riderProfileSchema.index({ status: 1, availability: 1, vehicleType: 1 });
riderProfileSchema.index({ availability: 1, updatedAt: -1 });
riderProfileSchema.index({ riskLevel: 1, updatedAt: -1 });

const RiderProfile =
  (models.RiderProfile as Model<IRiderProfile> | undefined) ||
  model<IRiderProfile>("RiderProfile", riderProfileSchema);

export default RiderProfile;
