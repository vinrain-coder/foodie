"use server";

import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

/**
 * Migration utility to repair corrupted wishlist data
 * 
 * This migration handles the corruption caused by mixed Better Auth + Mongoose
 * wishlist management, which created malformed data like:
 * - wishlist: ["[]"]  (stringified empty array)
 * - wishlist: null
 * - wishlist: "string"
 * - wishlist with invalid ObjectIds
 */

export interface MigrationStats {
  totalUsersChecked: number;
  usersRepaired: number;
  usersWithNullWishlist: number;
  usersWithStringWishlist: number;
  usersWithCorruptedItems: number;
  usersWithInvalidObjectIds: number;
  errors: Array<{ userId: string; error: string }>;
}

/**
 * Validates if a value is a valid MongoDB ObjectId
 */
function isValidObjectId(value: unknown): boolean {
  try {
    if (typeof value === "string") {
      return ObjectId.isValid(value);
    }
    if (value instanceof ObjectId) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detects corruption in wishlist data
 */
function detectWishlistCorruption(wishlist: unknown): {
  isCorrupted: boolean;
  corruptionType?: string;
} {
  // Null or undefined
  if (wishlist === null || wishlist === undefined) {
    return { isCorrupted: true, corruptionType: "null" };
  }

  // String value
  if (typeof wishlist === "string") {
    return { isCorrupted: true, corruptionType: "string" };
  }

  // Not an array
  if (!Array.isArray(wishlist)) {
    return { isCorrupted: true, corruptionType: "non-array" };
  }

  // Check array items
  if (wishlist.length > 0) {
    for (const item of wishlist) {
      // Corrupted item: stringified empty array
      if (typeof item === "string" && item === "[]") {
        return { isCorrupted: true, corruptionType: "stringified-array" };
      }

      // Invalid ObjectId
      if (!isValidObjectId(item)) {
        return { isCorrupted: true, corruptionType: "invalid-objectid" };
      }
    }
  }

  return { isCorrupted: false };
}

/**
 * Run the migration to repair all corrupted wishlist data
 * 
 * Usage:
 * ```
 * const stats = await migrateWishlistData();
 * console.log(`Repaired ${stats.usersRepaired} users`);
 * ```
 */
export async function migrateWishlistData(
  dryRun: boolean = false,
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsersChecked: 0,
    usersRepaired: 0,
    usersWithNullWishlist: 0,
    usersWithStringWishlist: 0,
    usersWithCorruptedItems: 0,
    usersWithInvalidObjectIds: 0,
    errors: [],
  };

  try {
    const db = await connectToDatabase();
    if (!db?.connection?.db) {
      throw new Error("Failed to connect to database");
    }

    const usersCollection = db.connection.db.collection("users");

    // Find all users with potentially corrupted wishlist
    const users = await usersCollection
      .find({})
      .project({ _id: 1, wishlist: 1, email: 1 })
      .toArray();

    stats.totalUsersChecked = users.length;

    for (const user of users) {
      try {
        const { isCorrupted, corruptionType } = detectWishlistCorruption(
          user.wishlist,
        );

        if (isCorrupted) {
          // Track corruption type
          switch (corruptionType) {
            case "null":
              stats.usersWithNullWishlist++;
              break;
            case "string":
              stats.usersWithStringWishlist++;
              break;
            case "stringified-array":
            case "non-array":
              stats.usersWithCorruptedItems++;
              break;
            case "invalid-objectid":
              stats.usersWithInvalidObjectIds++;
              break;
          }

          // Repair in actual migration (not dry-run)
          if (!dryRun) {
            await usersCollection.updateOne(
              { _id: user._id },
              { $set: { wishlist: [] } },
            );
          }

          stats.usersRepaired++;
        }
      } catch (error) {
        stats.errors.push({
          userId: user._id.toHexString(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return stats;
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Run a dry-run migration to see what would be repaired
 * Does not modify any data
 */
export async function dryRunMigration(): Promise<MigrationStats> {
  return migrateWishlistData(true);
}

/**
 * Get migration report without running the migration
 */
export async function getMigrationReport(): Promise<{
  canRun: boolean;
  message: string;
  stats?: MigrationStats;
}> {
  try {
    const stats = await dryRunMigration();

    if (stats.usersRepaired === 0) {
      return {
        canRun: true,
        message: "No corrupted wishlist data found",
        stats,
      };
    }

    return {
      canRun: true,
      message: `Found ${stats.usersRepaired} users with corrupted wishlist data. Ready to repair.`,
      stats,
    };
  } catch (error) {
    return {
      canRun: false,
      message: `Failed to generate report: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Admin endpoint to manually repair a specific user's wishlist
 */
export async function repairUserWishlist(userId: string): Promise<{
  success: boolean;
  message: string;
  wasCorrupted?: boolean;
}> {
  try {
    if (!ObjectId.isValid(userId)) {
      return {
        success: false,
        message: "Invalid user ID",
      };
    }

    const db = await connectToDatabase();
    if (!db?.connection?.db) {
      throw new Error("Failed to connect to database");
    }

    const usersCollection = db.connection.db.collection("users");
    const user = await usersCollection.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    const { isCorrupted } = detectWishlistCorruption(user.wishlist);

    if (isCorrupted) {
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { wishlist: [] } },
      );

      return {
        success: true,
        message: "User wishlist repaired successfully",
        wasCorrupted: true,
      };
    }

    return {
      success: true,
      message: "User wishlist is not corrupted",
      wasCorrupted: false,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate wishlist integrity for all users
 * Useful for post-migration verification
 */
export async function validateAllWishlists(): Promise<{
  valid: number;
  invalid: number;
  totalChecked: number;
  issues: Array<{ userId: string; issue: string }>;
}> {
  const result = {
    valid: 0,
    invalid: 0,
    totalChecked: 0,
    issues: [] as Array<{ userId: string; issue: string }>,
  };

  try {
    const db = await connectToDatabase();
    if (!db?.connection?.db) {
      throw new Error("Failed to connect to database");
    }

    const usersCollection = db.connection.db.collection("users");
    const users = await usersCollection
      .find({})
      .project({ _id: 1, wishlist: 1 })
      .toArray();

    result.totalChecked = users.length;

    for (const user of users) {
      const { isCorrupted } = detectWishlistCorruption(user.wishlist);

      if (isCorrupted) {
        result.invalid++;
        result.issues.push({
          userId: user._id.toHexString(),
          issue: `Corrupted wishlist: ${JSON.stringify(user.wishlist)}`,
        });
      } else {
        result.valid++;
      }
    }

    return result;
  } catch (error) {
    throw new Error(
      `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
