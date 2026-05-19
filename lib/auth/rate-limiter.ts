import { getDb } from "@/lib/db/client";
import { Collection, ObjectId } from "mongodb";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = {
  signin: 5,
  signup: 3,
  otp: 3,
  passwordReset: 3,
  magicLink: 3,
  emailVerification: 3,
  api: 100,
} as const;

interface RateLimitEntry {
  _id: ObjectId;
  key: string;
  count: number;
  resetAt: Date;
  createdAt: Date;
}

class RateLimiter {
  private collection: Collection<RateLimitEntry> | null = null;

  private async getCollection(): Promise<Collection<RateLimitEntry>> {
    if (!this.collection) {
      const db = await getDb();
      this.collection = db.collection("rateLimits");
      await this.collection.createIndex({ key: 1 }, { unique: true });
      await this.collection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
    }
    return this.collection;
  }

  async check(
    key: string,
    type: keyof typeof MAX_REQUESTS
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date; retryAfter?: number }> {
    const collection = await this.getCollection();
    const now = new Date();
    const limit = MAX_REQUESTS[type];

    const result = await collection.findOneAndUpdate(
      { key },
      [
        {
          $set: {
            count: {
              $cond: [{ $lt: ["$resetAt", now] }, 1, { $add: ["$count", 1] }],
            },
            resetAt: {
              $cond: [
                { $lt: ["$resetAt", now] },
                { $dateAdd: { startDate: now, unit: "millisecond", amount: WINDOW_MS } },
                "$resetAt",
              ],
            },
          },
        },
      ],
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    const entry = result ?? undefined;
    if (!entry) {
      const resetAt = new Date(now.getTime() + WINDOW_MS);
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    const value = entry;
    const isAllowed = value.count <= limit;
    const remaining = Math.max(0, limit - value.count);
    const retryAfter = isAllowed ? undefined : Math.ceil((value.resetAt.getTime() - now.getTime()) / 1000);

    return { allowed: isAllowed, remaining, resetAt: value.resetAt, retryAfter };
  }

  async consume(
    key: string,
    type: keyof typeof MAX_REQUESTS
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date; retryAfter?: number }> {
    return this.check(key, type);
  }
}

export const rateLimiter = new RateLimiter();

export function getRateLimitKey(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown";
  return `ratelimit:${ip}`;
}

export function getDeviceRateLimitKey(userId: string): string {
  return `ratelimit:user:${userId}`;
}
