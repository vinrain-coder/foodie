import { getDb } from "@/lib/db/client";
import { Collection, ObjectId } from "mongodb";
import crypto from "crypto";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

interface OTPEntry {
  _id: ObjectId;
  email: string;
  hashedCode: string;
  type: "signin" | "signup" | "password-reset" | "email-verification";
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

class OTPService {
  private collection: Collection<OTPEntry> | null = null;

  private async getCollection(): Promise<Collection<OTPEntry>> {
    if (!this.collection) {
      const db = await getDb();
      this.collection = db.collection("otps");
      await this.collection.createIndex({ email: 1, type: 1 });
      await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }
    return this.collection;
  }

  private hashCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }

  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createOTP(
    email: string,
    type: "signin" | "signup" | "password-reset" | "email-verification"
  ): Promise<string> {
    const collection = await this.getCollection();
    const code = this.generateCode();
    const hashedCode = this.hashCode(code);

    await collection.deleteMany({ email, type });

    await collection.insertOne({
      _id: new ObjectId(),
      email,
      hashedCode,
      type,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      createdAt: new Date(),
    });

    return code;
  }

  async verifyOTP(
    email: string,
    code: string,
    type: "signin" | "signup" | "password-reset" | "email-verification"
  ): Promise<{ valid: boolean; reason?: string }> {
    const collection = await this.getCollection();
    const hashedCode = this.hashCode(code);

    const entry = await collection.findOne({ email, type });

    if (!entry) {
      return { valid: false, reason: "Invalid or expired code" };
    }

    if (entry.expiresAt < new Date()) {
      await collection.deleteOne({ _id: entry._id });
      return { valid: false, reason: "Code has expired" };
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      await collection.deleteOne({ _id: entry._id });
      return { valid: false, reason: "Too many attempts. Please request a new code" };
    }

    if (entry.hashedCode !== hashedCode) {
      await collection.updateOne({ _id: entry._id }, { $inc: { attempts: 1 } });
      return { valid: false, reason: "Invalid code" };
    }

    await collection.deleteOne({ _id: entry._id });
    return { valid: true };
  }

  async consumeOTP(
    email: string,
    code: string,
    type: "signin" | "signup" | "password-reset" | "email-verification"
  ): Promise<boolean> {
    const { valid } = await this.verifyOTP(email, code, type);
    return valid;
  }
}

export const otpService = new OTPService();
