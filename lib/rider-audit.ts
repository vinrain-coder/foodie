import mongoose from "mongoose";
import RiderAuditLog, {
  RiderAuditAction,
  RiderAuditActorType,
} from "@/lib/db/models/rider-audit-log.model";

const normalizeObjectId = (value?: string | mongoose.Types.ObjectId | null) => {
  if (!value) return undefined;
  const raw = value.toString();
  if (!mongoose.Types.ObjectId.isValid(raw)) return undefined;
  return new mongoose.Types.ObjectId(raw);
};

export async function recordRiderAuditLog(input: {
  riderId?: string | mongoose.Types.ObjectId | null;
  deliveryJobId?: string | mongoose.Types.ObjectId | null;
  orderId?: string | mongoose.Types.ObjectId | null;
  actorType: RiderAuditActorType;
  actorId?: string | mongoose.Types.ObjectId | null;
  action: RiderAuditAction;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await RiderAuditLog.create({
    rider: normalizeObjectId(input.riderId),
    deliveryJob: normalizeObjectId(input.deliveryJobId),
    order: normalizeObjectId(input.orderId),
    actorType: input.actorType,
    actorId: normalizeObjectId(input.actorId),
    action: input.action,
    fromStatus: input.fromStatus || "",
    toStatus: input.toStatus || "",
    reason: input.reason || "",
    metadata: input.metadata || {},
  });
}
