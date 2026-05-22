import { connectToDatabase } from "@/lib/db";
import DeliveryJob from "@/lib/db/models/delivery-job.model";
import Order from "@/lib/db/models/order.model";
import RiderLocationPing from "@/lib/db/models/rider-location-ping.model";
import RiderProfile from "@/lib/db/models/rider-profile.model";

const DEFAULT_KMH = 24;

export type LiveTrackingViewer = "public" | "staff";

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

function toSpeedKmh(speed?: number) {
  if (speed === undefined || !Number.isFinite(speed)) return DEFAULT_KMH;
  // Device APIs usually send m/s; normalize with defensive bounds.
  return clamp(speed * 3.6, 8, 90);
}

export async function getLiveTrackingSnapshotByTrackingNumber(
  trackingNumber: string,
  viewer: LiveTrackingViewer = "public",
) {
  await connectToDatabase();

  const order = await Order.findOne({ trackingNumber })
    .select(
      "_id trackingNumber status trackingHistory shipment expectedDeliveryDate shippingAddress items itemsPrice shippingPrice taxPrice totalPrice updatedAt assignedRider deliveryJob",
    )
    .lean();
  if (!order) return null;

  const deliveryJob =
    order.deliveryJob
      ? await DeliveryJob.findById(order.deliveryJob)
          .select(
            "state rider pickup dropoff promisedBy acceptedAt pickedUpAt deliveredAt updatedAt lastMovementAt lastIdleAlertAt lastOffRouteAlertAt lastEtaDriftAlertAt",
          )
          .lean()
      : null;

  const riderUserId = deliveryJob?.rider || order.assignedRider;
  const riderProfile = riderUserId
    ? await RiderProfile.findOne({ user: riderUserId })
        .select("currentLocation currentHeartbeatAt")
        .lean()
    : null;

  const latestPing = riderUserId
    ? await RiderLocationPing.findOne(
        deliveryJob?._id
          ? { rider: riderUserId, deliveryJob: deliveryJob._id }
          : { rider: riderUserId },
      )
        .sort({ capturedAt: -1 })
        .select(
          "lat lng speed heading battery capturedAt routeDeviationM etaDriftMinutes alertFlags sampleCount",
        )
        .lean()
    : null;

  const currentLocation = latestPing
    ? {
        lat: latestPing.lat,
        lng: latestPing.lng,
        speed: latestPing.speed,
        heading: latestPing.heading,
        battery: latestPing.battery,
        capturedAt: latestPing.capturedAt,
      }
    : riderProfile?.currentLocation
      ? {
          lat: riderProfile.currentLocation.lat,
          lng: riderProfile.currentLocation.lng,
          speed: riderProfile.currentLocation.speed,
          heading: riderProfile.currentLocation.heading,
          capturedAt:
            riderProfile.currentLocation.updatedAt || riderProfile.currentHeartbeatAt,
        }
      : null;

  const destination =
    deliveryJob?.state === "accepted" ? deliveryJob.pickup : deliveryJob?.dropoff;
  const hasDestinationCoordinates =
    Number.isFinite(destination?.lat) && Number.isFinite(destination?.lng);
  const hasCurrentCoordinates =
    currentLocation &&
    Number.isFinite(currentLocation.lat) &&
    Number.isFinite(currentLocation.lng);

  let distanceToDestinationKm: number | undefined;
  let etaMinutes: number | undefined;
  if (hasDestinationCoordinates && hasCurrentCoordinates) {
    distanceToDestinationKm = haversineKm(
      Number(currentLocation!.lat),
      Number(currentLocation!.lng),
      Number(destination!.lat),
      Number(destination!.lng),
    );
    etaMinutes =
      (distanceToDestinationKm / toSpeedKmh(currentLocation!.speed)) * 60;
  }

  const expectedAtRaw = deliveryJob?.promisedBy || order.expectedDeliveryDate;
  const predictedArrivalAt =
    etaMinutes !== undefined
      ? new Date(Date.now() + etaMinutes * 60 * 1000).toISOString()
      : undefined;
  const etaDriftMinutes =
    expectedAtRaw && predictedArrivalAt
      ? Number(
          (
            (new Date(predictedArrivalAt).getTime() -
              new Date(expectedAtRaw).getTime()) /
            60000
          ).toFixed(2),
        )
      : latestPing?.etaDriftMinutes;

  const shippingAddress =
    viewer === "public"
      ? {
          fullName: order.shippingAddress?.fullName,
          city: order.shippingAddress?.city,
          country: order.shippingAddress?.country,
          street: "Hidden for privacy",
        }
      : order.shippingAddress;

  const trackingHistory = [...(order.trackingHistory || [])]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 40);

  return {
    _id: order._id.toString(),
    trackingNumber: order.trackingNumber,
    status: order.status,
    expectedDeliveryDate: order.expectedDeliveryDate,
    shipment: order.shipment,
    shippingAddress,
    items: order.items,
    itemsPrice: order.itemsPrice,
    shippingPrice: order.shippingPrice,
    taxPrice: order.taxPrice,
    totalPrice: order.totalPrice,
    trackingHistory,
    updatedAt: order.updatedAt,
    live: {
      deliveryJobState: deliveryJob?.state,
      destination:
        destination && destination.address
          ? {
              address: destination.address,
              city: destination.city,
              country: destination.country,
              lat: destination.lat,
              lng: destination.lng,
            }
          : undefined,
      currentLocation,
      distanceToDestinationKm:
        distanceToDestinationKm !== undefined
          ? Number(distanceToDestinationKm.toFixed(3))
          : undefined,
      etaMinutes:
        etaMinutes !== undefined ? Number(etaMinutes.toFixed(2)) : undefined,
      predictedArrivalAt,
      etaDriftMinutes:
        etaDriftMinutes !== undefined ? Number(etaDriftMinutes) : undefined,
      routeDeviationM: latestPing?.routeDeviationM,
      latestAlertFlags: latestPing?.alertFlags || [],
      snapshotSampleCount: latestPing?.sampleCount || 1,
      alerts: {
        idle: deliveryJob?.lastIdleAlertAt || null,
        offRoute: deliveryJob?.lastOffRouteAlertAt || null,
        etaDrift: deliveryJob?.lastEtaDriftAlertAt || null,
      },
      heartbeatAt:
        currentLocation?.capturedAt || riderProfile?.currentHeartbeatAt || null,
    },
    now: new Date().toISOString(),
  };
}
