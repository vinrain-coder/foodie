"use server";

import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { IMenuItem } from "../db/models/menu.item.model";

type UserWishlistDocument = {
  _id: ObjectId;
  wishlist?: ObjectId[];
};

function isValidObjectId(value: unknown): boolean {
  try {
    if (typeof value === "string") {
      if (
        value === "[]" ||
        value === "" ||
        value === "null" ||
        value === "undefined"
      ) {
        return false;
      }
      return ObjectId.isValid(value);
    }
    if (value instanceof ObjectId || value instanceof mongoose.Types.ObjectId) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

type WishlistMenuItemDocument = Omit<IMenuItem, "_id"> & {
  _id: ObjectId;
};

async function getDb() {
  const connection = await connectToDatabase();
  const db = connection.connection.db;
  if (!db) {
    throw new Error("Database is not initialized");
  }
  return db;
}

async function getCurrentUser() {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  const db = await getDb();
  return db.collection<UserWishlistDocument>("users").findOne({
    _id: new ObjectId(session.user.id),
  });
}

export async function repairCorruptedWishlist(
  usersCollection: { updateOne: (filter: { _id: ObjectId }, update: { $set: { wishlist: ObjectId[] } }) => Promise<{ matchedCount: number }> },
  userId: ObjectId,
  wishlist: unknown,
): Promise<boolean> {
  let needsRepair = false;

  if (wishlist === null || wishlist === undefined) {
    needsRepair = true;
  } else if (typeof wishlist === "string") {
    needsRepair = true;
  } else if (!Array.isArray(wishlist)) {
    needsRepair = true;
  } else {
    for (const item of wishlist) {
      if (!isValidObjectId(item)) {
        needsRepair = true;
        break;
      }
    }
  }

  if (needsRepair) {
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { wishlist: [] } },
    );
    return true;
  }

  return false;
}

export async function ensureWishlistIsArray(userId: string) {
  const db = await getDb();
  const usersCollection = db.collection<UserWishlistDocument>("users");
  const objectUserId = new ObjectId(userId);

  const user = await usersCollection.findOne({ _id: objectUserId });
  if (!user) return;

  await repairCorruptedWishlist(usersCollection, objectUserId, user.wishlist);
}

export async function getWishlist(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return (Array.isArray(user.wishlist) ? user.wishlist : []).map((id) =>
    id.toString(),
  );
}

export async function addToWishlist(menuItemId: string): Promise<string[]> {
  const session = await getServerSession();
  if (!session?.user?.id) return [];

  await ensureWishlistIsArray(session.user.id);

  const db = await getDb();
  const usersCollection = db.collection<UserWishlistDocument>("users");
  const result = await usersCollection.findOneAndUpdate(
    { _id: new ObjectId(session.user.id) },
    { $addToSet: { wishlist: new ObjectId(menuItemId) } },
    { returnDocument: "after" },
  );

  const wishlist = result?.wishlist ?? [];
  return wishlist.map((id) => id.toString());
}

export async function removeFromWishlist(menuItemId: string): Promise<string[]> {
  const session = await getServerSession();
  if (!session?.user?.id) return [];

  await ensureWishlistIsArray(session.user.id);

  const db = await getDb();
  const usersCollection = db.collection<UserWishlistDocument>("users");
  const result = await usersCollection.findOneAndUpdate(
    { _id: new ObjectId(session.user.id) },
    { $pull: { wishlist: new ObjectId(menuItemId) } },
    { returnDocument: "after" },
  );

  const wishlist = result?.wishlist ?? [];
  return wishlist.map((id) => id.toString());
}

export async function getWishlistMenuItems(): Promise<IMenuItem[]> {
  const user = await getCurrentUser();

  if (!Array.isArray(user?.wishlist) || user.wishlist.length === 0) {
    return [];
  }

  const db = await getDb();

  const menuItemsCollection = db.collection<WishlistMenuItemDocument>("menuItems");

  const menuItems = await menuItemsCollection
    .find({
      _id: {
        $in: user.wishlist.map((id) => new ObjectId(id)),
      },
    })
    .toArray();

  return menuItems.map((menuItem) => ({
    ...menuItem,
    _id: new mongoose.Types.ObjectId(menuItem._id.toHexString()),
  })) as IMenuItem[];
}

export async function getWishlistCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return Array.isArray(user.wishlist) ? user.wishlist.length : 0;
}