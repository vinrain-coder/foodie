import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import RiderLocationPing from "@/lib/db/models/rider-location-ping.model";

type CompressRiderLocationHistoryInput = {
  olderThanMinutes?: number;
  limit?: number;
};

export async function compressRiderLocationHistory(
  input: CompressRiderLocationHistoryInput = {},
) {
  await connectToDatabase();

  const olderThanMinutes = Math.max(
    30,
    Math.min(24 * 60, Math.floor(input.olderThanMinutes || 120)),
  );
  const limit = Math.max(100, Math.min(5000, Math.floor(input.limit || 2000)));
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const candidates = await RiderLocationPing.find({
    capturedAt: { $lte: cutoff },
  })
    .sort({ capturedAt: -1 })
    .limit(limit)
    .select("_id rider deliveryJob capturedAt sampleCount alertFlags")
    .lean();

  type Bucket = {
    keepId: mongoose.Types.ObjectId;
    totalSamples: number;
    alertFlags: Set<string>;
    deleteIds: mongoose.Types.ObjectId[];
  };
  const buckets = new Map<string, Bucket>();

  for (const item of candidates) {
    if (!item?._id || !item?.rider || !item?.capturedAt) continue;
    const minuteBucket = new Date(
      Math.floor(new Date(item.capturedAt).getTime() / 60000) * 60000,
    ).toISOString();
    const key = `${item.rider.toString()}|${
      item.deliveryJob?.toString() || "none"
    }|${minuteBucket}`;

    const entry = buckets.get(key);
    if (!entry) {
      buckets.set(key, {
        keepId: item._id as mongoose.Types.ObjectId,
        totalSamples: Math.max(1, Number(item.sampleCount || 1)),
        alertFlags: new Set((item.alertFlags || []).filter(Boolean)),
        deleteIds: [],
      });
      continue;
    }

    entry.totalSamples += Math.max(1, Number(item.sampleCount || 1));
    for (const flag of item.alertFlags || []) {
      if (flag) entry.alertFlags.add(flag);
    }
    entry.deleteIds.push(item._id as mongoose.Types.ObjectId);
  }

  const updateOps: Array<{
    updateOne: {
      filter: Record<string, unknown>;
      update: Record<string, unknown>;
    };
  }> = [];
  const deleteIds: mongoose.Types.ObjectId[] = [];

  for (const bucket of buckets.values()) {
    if (bucket.deleteIds.length === 0) continue;
    updateOps.push({
      updateOne: {
        filter: { _id: bucket.keepId },
        update: {
          $set: {
            sampleCount: Math.max(1, bucket.totalSamples),
            alertFlags: Array.from(bucket.alertFlags),
          },
        },
      },
    });
    deleteIds.push(...bucket.deleteIds);
  }

  if (updateOps.length > 0) {
    await RiderLocationPing.bulkWrite(updateOps, { ordered: false });
  }
  if (deleteIds.length > 0) {
    await RiderLocationPing.deleteMany({ _id: { $in: deleteIds } });
  }

  return {
    scanned: candidates.length,
    mergedBuckets: updateOps.length,
    deletedPoints: deleteIds.length,
    olderThanMinutes,
    cutoff: cutoff.toISOString(),
  };
}
