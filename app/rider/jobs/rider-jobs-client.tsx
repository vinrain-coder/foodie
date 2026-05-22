"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptDeliveryJob,
  completeDeliveryJob,
  markPickupCompleted,
  setRiderAvailability,
} from "@/lib/actions/rider.actions";
import { useUploadThing } from "@/lib/uploadthing";
import { formatDateTime } from "@/lib/utils";
import { getUploadthingFileUrl, isSafeMediaUrl } from "@/lib/uploadthing-media";

const ACTION_QUEUE_STORAGE_KEY = "rider.jobs.offline-queue.v1";
const RIDER_DEVICE_FINGERPRINT_KEY = "rider.device.fingerprint.v1";
const MAX_QUEUE_ITEMS = 60;
const CALL_RELAY_NUMBER = String(
  process.env.NEXT_PUBLIC_RIDER_CALL_RELAY_NUMBER || "",
).trim();
const CHAT_RELAY_NUMBER = String(
  process.env.NEXT_PUBLIC_RIDER_CHAT_RELAY_NUMBER || CALL_RELAY_NUMBER,
).trim();

type JobRow = {
  _id: string;
  state: string;
  offerExpiresAt?: string;
  updatedAt?: string;
  pickup: { address: string; city?: string; lat?: number; lng?: number };
  dropoff: { address: string; city: string; lat?: number; lng?: number };
  order?: {
    _id?: string;
    trackingNumber?: string;
    totalPrice?: number;
    shippingAddress?: { fullName?: string; phone?: string };
  };
  restaurant?: { name?: string; location?: string };
};

type RiderDashboardData = {
  profile: {
    _id: string;
    status: "pending_kyc" | "active" | "suspended";
    availability: "offline" | "idle" | "on_trip";
    completedJobs: number;
  } | null;
  availableJobs: JobRow[];
  myActiveJobs: JobRow[];
  myRecentJobs: JobRow[];
  earnings: Array<{ _id: string; total: number }>;
  balance: {
    pendingBalance: number;
    availableBalance: number;
    reservedBalance: number;
    lifetimeEarned: number;
    lifetimePaid: number;
  };
  payoutPolicy: {
    currency: string;
    payoutSchedule: "daily" | "weekly";
    minimumPayoutAmount: number;
  };
};

type CompletionProofInput = {
  recipientName?: string;
  note?: string;
  signatureUrl?: string;
  photoUrls?: string[];
  geotag?: {
    lat: number;
    lng: number;
    accuracyM?: number;
  };
  clientCapturedAt?: Date | string;
};

type RiderActionResponse = {
  success: boolean;
  message?: string;
  otp?: string;
};

type QueueSetAvailability = {
  id: string;
  type: "set-availability";
  createdAt: number;
  payload: { availability: "offline" | "idle" };
};

type QueueAcceptJob = {
  id: string;
  type: "accept-job";
  createdAt: number;
  payload: { jobId: string };
};

type QueuePickupJob = {
  id: string;
  type: "pickup-job";
  createdAt: number;
  payload: { jobId: string; location?: string };
};

type QueueCompleteJob = {
  id: string;
  type: "complete-job";
  createdAt: number;
  payload: {
    jobId: string;
    otp: string;
    location?: string;
    proof: CompletionProofInput;
  };
};

type QueueLocationPing = {
  id: string;
  type: "location-ping";
  createdAt: number;
  payload: {
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    battery?: number;
    deliveryJobId?: string;
    deviceFingerprint?: string;
  };
};

type RiderQueuedAction =
  | QueueSetAvailability
  | QueueAcceptJob
  | QueuePickupJob
  | QueueCompleteJob
  | QueueLocationPing;

type BatteryManagerLike = {
  level: number;
  addEventListener?: (
    event: "levelchange" | "chargingchange",
    listener: () => void,
  ) => void;
  removeEventListener?: (
    event: "levelchange" | "chargingchange",
    listener: () => void,
  ) => void;
};

function availabilityVariant(value?: string): "secondary" | "pending" | "success" {
  if (value === "on_trip") return "pending";
  if (value === "idle") return "success";
  return "secondary";
}

function maskPhone(phone?: string) {
  const raw = String(phone || "").trim();
  const chars = raw.replace(/\s+/g, "");
  if (!chars) return "Hidden";
  if (chars.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, chars.length - 4))}${chars.slice(-4)}`;
}

function toDialNumber(phone?: string) {
  const value = String(phone || "").trim();
  if (!value) return "";
  return value.replace(/[^\d+]/g, "");
}

function toWhatsappNumber(phone?: string) {
  const value = String(phone || "").trim();
  if (!value) return "";
  return value.replace(/[^\d]/g, "");
}

function toDestinationQuery(job: JobRow, stop: "pickup" | "dropoff") {
  const point = stop === "pickup" ? job.pickup : job.dropoff;
  const hasCoords = Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
  if (hasCoords) {
    return `${Number(point.lat)},${Number(point.lng)}`;
  }
  return `${point?.address || ""} ${point?.city || ""}`.trim();
}

function buildGoogleMapsDirectionsUrl(job: JobRow, stop: "pickup" | "dropoff") {
  const destination = toDestinationQuery(job, stop);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

function formatOfferCountdown(msRemaining: number) {
  if (msRemaining <= 0) return "Expired";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function normalizeQueuedActions(
  actions: RiderQueuedAction[],
): RiderQueuedAction[] {
  const keep: RiderQueuedAction[] = [];
  for (const action of actions) {
    if (action.type !== "location-ping") {
      keep.push(action);
      continue;
    }

    const existingIndex = keep.findIndex(
      (item) =>
        item.type === "location-ping" &&
        item.payload.deliveryJobId === action.payload.deliveryJobId,
    );
    if (existingIndex >= 0) {
      keep[existingIndex] = action;
    } else {
      keep.push(action);
    }
  }

  return keep.slice(-MAX_QUEUE_ITEMS);
}

function parseStoredQueue(value: string | null): RiderQueuedAction[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return normalizeQueuedActions(
      parsed.filter((item) => item && typeof item === "object"),
    );
  } catch {
    return [];
  }
}

function isLikelyNetworkError(error: unknown) {
  const text = String((error as { message?: string })?.message || error || "")
    .toLowerCase()
    .trim();
  return (
    text.includes("network") ||
    text.includes("failed to fetch") ||
    text.includes("fetch failed") ||
    text.includes("timeout")
  );
}

function getOrCreateRiderDeviceFingerprint() {
  if (typeof window === "undefined") return "";
  const existing = String(
    window.localStorage.getItem(RIDER_DEVICE_FINGERPRINT_KEY) || "",
  ).trim();
  if (existing) return existing;

  const seed = `${Date.now()}-${Math.random()}-${window.navigator.userAgent}`;
  const created = `rd-${btoa(seed).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}`;
  window.localStorage.setItem(RIDER_DEVICE_FINGERPRINT_KEY, created);
  return created;
}

export default function RiderJobsClient({ data }: { data: RiderDashboardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [otpByJobId, setOtpByJobId] = useState<Record<string, string>>({});
  const [recipientByJobId, setRecipientByJobId] = useState<Record<string, string>>({});
  const [noteByJobId, setNoteByJobId] = useState<Record<string, string>>({});
  const [proofPhotosByJobId, setProofPhotosByJobId] = useState<
    Record<string, string[]>
  >({});
  const [queuedActions, setQueuedActions] = useState<RiderQueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueSyncInProgress, setQueueSyncInProgress] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastKnownGeo, setLastKnownGeo] = useState<{
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    accuracyM?: number;
    capturedAt: number;
  } | null>(null);
  const [batteryPct, setBatteryPct] = useState<number>(100);
  const [lastLocationPingAt, setLastLocationPingAt] = useState<number | null>(null);

  const queueRef = useRef<RiderQueuedAction[]>([]);
  const isSyncingRef = useRef(false);

  const activeJob = data.myActiveJobs[0];
  const activeJobId = activeJob?._id;
  const riderDeviceFingerprint = useMemo(
    () => getOrCreateRiderDeviceFingerprint(),
    [],
  );

  const earningsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of data.earnings || []) {
      map[item._id] = item.total || 0;
    }
    return map;
  }, [data.earnings]);

  const uploadHandlersByJobId = useMemo(() => {
    return new Map<string, true>(
      data.myActiveJobs
        .filter((job) => job.state === "picked_up")
        .map((job) => [job._id, true]),
    );
  }, [data.myActiveJobs]);

  const { startUpload, isUploading } = useUploadThing("riderProofs", {
    onClientUploadComplete: (files) => {
      const uploadedUrls = (files || [])
        .map((file) => getUploadthingFileUrl(file))
        .filter((url) => isSafeMediaUrl(url));
      if (uploadedUrls.length === 0) return;

      const uploadingJobId = window.sessionStorage.getItem(
        "rider-proof-upload-job",
      );
      if (!uploadingJobId) return;
      if (!uploadHandlersByJobId.has(uploadingJobId)) return;

      setProofPhotosByJobId((prev) => {
        const current = prev[uploadingJobId] || [];
        const merged = Array.from(new Set([...current, ...uploadedUrls])).slice(0, 5);
        return { ...prev, [uploadingJobId]: merged };
      });
      toast.success("Proof photo uploaded");
    },
    onUploadError: (error) => {
      toast.error(error.message);
    },
  });

  const persistQueue = useCallback((nextQueue: RiderQueuedAction[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      ACTION_QUEUE_STORAGE_KEY,
      JSON.stringify(nextQueue),
    );
  }, []);

  const queueAction = useCallback(
    (action: RiderQueuedAction, notice: string, options?: { silent?: boolean }) => {
      setQueuedActions((prev) => {
        const next = normalizeQueuedActions([...prev, action]);
        persistQueue(next);
        return next;
      });
      if (!options?.silent) {
        toast.message(notice);
      }
    },
    [persistQueue],
  );

  const submitLocationPing = useCallback(
    async (payload: QueueLocationPing["payload"]) => {
      const response = await fetch("/api/rider/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message || "Location update failed");
      }
      setLastLocationPingAt(Date.now());
    },
    [],
  );

  const executeQueuedAction = useCallback(
    async (action: RiderQueuedAction): Promise<RiderActionResponse> => {
      if (action.type === "set-availability") {
        return setRiderAvailability(action.payload.availability);
      }
      if (action.type === "accept-job") {
        return acceptDeliveryJob(action.payload.jobId);
      }
      if (action.type === "pickup-job") {
        return markPickupCompleted(action.payload.jobId, action.payload.location);
      }
      if (action.type === "complete-job") {
        return completeDeliveryJob(
          action.payload.jobId,
          action.payload.otp,
          action.payload.location,
          action.payload.proof,
        );
      }

      await submitLocationPing(action.payload);
      return { success: true, message: "Location synced" };
    },
    [submitLocationPing],
  );

  const syncQueuedActions = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof window === "undefined") return;
    if (!window.navigator.onLine) return;

    const pending = queueRef.current;
    if (pending.length === 0) return;

    isSyncingRef.current = true;
    setQueueSyncInProgress(true);

    let remaining = [...pending];
    let successCount = 0;

    for (let index = 0; index < pending.length; index += 1) {
      const action = pending[index];
      try {
        const response = await executeQueuedAction(action);
        if (!response.success) {
          remaining = remaining.slice(1);
          const message = response.message || "Queued action failed and was dropped";
          toast.error(message);
          continue;
        }
        remaining = remaining.slice(1);
        successCount += 1;
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          break;
        }
        remaining = remaining.slice(1);
        toast.error(
          (error as { message?: string })?.message ||
            "Queued action failed and was dropped",
        );
      }
    }

    setQueuedActions(remaining);
    persistQueue(remaining);

    if (successCount > 0) {
      toast.success(`${successCount} queued action(s) synced`);
      router.refresh();
    }

    isSyncingRef.current = false;
    setQueueSyncInProgress(false);
  }, [executeQueuedAction, persistQueue, router]);

  const runAction = useCallback(
    async (
      directAction: () => Promise<RiderActionResponse>,
      queuedAction: RiderQueuedAction,
      offlineNotice: string,
    ) => {
      const canSendNow =
        typeof window !== "undefined" ? window.navigator.onLine : true;

      if (!canSendNow) {
        queueAction(queuedAction, offlineNotice);
        return;
      }

      startTransition(async () => {
        try {
          const response = await directAction();
          if (response.success) {
            toast.success(response.message || "Action completed");
            router.refresh();
            return;
          }

          toast.error(response.message || "Action failed");
        } catch (error) {
          if (isLikelyNetworkError(error)) {
            queueAction(
              queuedAction,
              "Connection dropped. Action queued and will sync automatically.",
            );
            return;
          }
          toast.error(
            (error as { message?: string })?.message || "Unexpected action error",
          );
        }
      });
    },
    [queueAction, router, startTransition],
  );

  const getCurrentGeotag = useCallback(async () => {
    if (typeof window === "undefined" || !window.navigator.geolocation) {
      return lastKnownGeo
        ? {
            lat: lastKnownGeo.lat,
            lng: lastKnownGeo.lng,
            accuracyM: lastKnownGeo.accuracyM,
          }
        : undefined;
    }

    const fromBrowser = await new Promise<{
      lat: number;
      lng: number;
      accuracyM?: number;
      speed?: number;
      heading?: number;
    } | null>((resolve) => {
      window.navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : undefined,
            speed:
              Number.isFinite(position.coords.speed) && position.coords.speed !== null
                ? Math.max(0, position.coords.speed)
                : undefined,
            heading:
              Number.isFinite(position.coords.heading) &&
              position.coords.heading !== null
                ? position.coords.heading
                : undefined,
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 15000,
        },
      );
    });

    if (fromBrowser) {
      setLastKnownGeo({
        ...fromBrowser,
        capturedAt: Date.now(),
      });
      return fromBrowser;
    }

    if (lastKnownGeo) {
      return {
        lat: lastKnownGeo.lat,
        lng: lastKnownGeo.lng,
        accuracyM: lastKnownGeo.accuracyM,
        speed: lastKnownGeo.speed,
        heading: lastKnownGeo.heading,
      };
    }

    return undefined;
  }, [lastKnownGeo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueRef.current = queuedActions;
  }, [queuedActions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(window.navigator.onLine);
    const initialQueue = parseStoredQueue(
      window.localStorage.getItem(ACTION_QUEUE_STORAGE_KEY),
    );
    setQueuedActions(initialQueue);
    queueRef.current = initialQueue;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      setIsOnline(true);
      syncQueuedActions();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncQueuedActions]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (queuedActions.length === 0) return;
    if (!isOnline) return;
    syncQueuedActions();
  }, [isOnline, queuedActions.length, syncQueuedActions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as Navigator & {
      getBattery?: () => Promise<BatteryManagerLike>;
    };
    if (typeof nav.getBattery !== "function") return;

    let mounted = true;
    let battery: BatteryManagerLike | null = null;
    const onBatteryChange = () => {
      if (!battery || !mounted) return;
      setBatteryPct(Math.round(Math.max(0, Math.min(1, battery.level)) * 100));
    };

    nav
      .getBattery()
      .then((result) => {
        if (!mounted) return;
        battery = result;
        onBatteryChange();
        battery.addEventListener?.("levelchange", onBatteryChange);
        battery.addEventListener?.("chargingchange", onBatteryChange);
      })
      .catch(() => {
        // no-op
      });

    return () => {
      mounted = false;
      battery?.removeEventListener?.("levelchange", onBatteryChange);
      battery?.removeEventListener?.("chargingchange", onBatteryChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.navigator.geolocation) return;
    if (!data.profile || data.profile.availability === "offline") return;

    const hasActiveJob = Boolean(activeJobId);
    const intervalMs = hasActiveJob
      ? batteryPct <= 20
        ? 60000
        : batteryPct <= 40
          ? 30000
          : 15000
      : batteryPct <= 20
        ? 300000
        : 120000;

    const sendPing = () => {
      window.navigator.geolocation.getCurrentPosition(
        async (position) => {
          const payload: QueueLocationPing["payload"] = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            speed:
              Number.isFinite(position.coords.speed) &&
              position.coords.speed !== null
                ? Math.max(0, position.coords.speed)
                : undefined,
            heading:
              Number.isFinite(position.coords.heading) &&
              position.coords.heading !== null
                ? position.coords.heading
                : undefined,
            battery: batteryPct,
            deliveryJobId: activeJobId,
            deviceFingerprint: riderDeviceFingerprint || undefined,
          };

          setLastKnownGeo({
            lat: payload.lat,
            lng: payload.lng,
            speed: payload.speed,
            heading: payload.heading,
            accuracyM: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : undefined,
            capturedAt: Date.now(),
          });

          try {
            if (!window.navigator.onLine) {
              queueAction(
                {
                  id: `loc-${Date.now()}`,
                  type: "location-ping",
                  createdAt: Date.now(),
                  payload,
                },
                "Offline: location update queued",
                { silent: true },
              );
              return;
            }
            await submitLocationPing(payload);
          } catch (error) {
            if (!isLikelyNetworkError(error)) return;
            queueAction(
              {
                id: `loc-${Date.now()}`,
                type: "location-ping",
                createdAt: Date.now(),
                payload,
              },
              "Network issue: location update queued",
              { silent: true },
            );
          }
        },
        () => {
          // no-op
        },
        {
          enableHighAccuracy: hasActiveJob,
          maximumAge: hasActiveJob ? 10000 : 45000,
          timeout: hasActiveJob ? 12000 : 18000,
        },
      );
    };

    sendPing();
    const id = window.setInterval(sendPing, intervalMs);
    return () => window.clearInterval(id);
  }, [
    activeJobId,
    batteryPct,
    data.profile,
    queueAction,
    submitLocationPing,
    isOnline,
    riderDeviceFingerprint,
  ]);

  return (
    <div className="space-y-4">
      {!isOnline ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-900">
            Offline mode is active. Actions are queued and will sync on reconnect.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Profile status</p>
            <p className="text-base font-semibold">
              {data.profile?.status || "pending_kyc"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Availability</p>
            <div className="mt-1">
              <Badge variant={availabilityVariant(data.profile?.availability)}>
                {data.profile?.availability || "offline"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Completed jobs</p>
            <p className="text-base font-semibold">{data.profile?.completedJobs || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Pending earnings</p>
            <p className="text-base font-semibold">
              {data.payoutPolicy?.currency || "KES"}{" "}
              {Number(data.balance?.pendingBalance || earningsByStatus.pending || 0).toFixed(
                2,
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Available balance</p>
            <p className="text-base font-semibold">
              {data.payoutPolicy?.currency || "KES"}{" "}
              {Number(
                data.balance?.availableBalance || earningsByStatus.available || 0,
              ).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">On hold for payout</p>
            <p className="text-base font-semibold">
              {data.payoutPolicy?.currency || "KES"}{" "}
              {Number(data.balance?.reservedBalance || earningsByStatus.held || 0).toFixed(
                2,
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payout Policy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <p>
            Schedule:{" "}
            <span className="font-semibold capitalize">
              {data.payoutPolicy?.payoutSchedule || "weekly"}
            </span>
          </p>
          <p>
            Minimum threshold:{" "}
            <span className="font-semibold">
              {data.payoutPolicy?.currency || "KES"}{" "}
              {Number(data.payoutPolicy?.minimumPayoutAmount || 0).toFixed(2)}
            </span>
          </p>
          <p>
            Eligible now:{" "}
            <span className="font-semibold">
              {(data.balance?.availableBalance || 0) >=
              Number(data.payoutPolicy?.minimumPayoutAmount || 0)
                ? "Yes"
                : "No"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mobile Ops Status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-4">
          <p>
            Queue: <span className="font-semibold">{queuedActions.length}</span>
          </p>
          <p>
            Sync:{" "}
            <span className="font-semibold">
              {queueSyncInProgress ? "in progress" : "idle"}
            </span>
          </p>
          <p>
            Battery: <span className="font-semibold">{batteryPct}%</span>
          </p>
          <p>
            GPS:{" "}
            <span className="font-semibold">
              {lastLocationPingAt
                ? formatDateTime(new Date(lastLocationPingAt)).dateTime
                : "not sent"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Availability Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            disabled={isPending}
            variant="outline"
            onClick={() =>
              runAction(
                () => setRiderAvailability("offline"),
                {
                  id: `availability-offline-${Date.now()}`,
                  type: "set-availability",
                  createdAt: Date.now(),
                  payload: { availability: "offline" },
                },
                "You are offline. 'Go Offline' was added to the sync queue.",
              )
            }
          >
            Go Offline
          </Button>
          <Button
            disabled={isPending}
            onClick={() =>
              runAction(
                () => setRiderAvailability("idle"),
                {
                  id: `availability-idle-${Date.now()}`,
                  type: "set-availability",
                  createdAt: Date.now(),
                  payload: { availability: "idle" },
                },
                "You are offline. 'Go Online' was added to the sync queue.",
              )
            }
          >
            Go Online
          </Button>
          <Button asChild variant="outline">
            <Link href="/rider/timelines">View Dispatch Timeline</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Active Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.myActiveJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active jobs right now.</p>
          ) : (
            data.myActiveJobs.map((job) => (
              <div key={job._id} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {job.order?.trackingNumber || "No tracking number"}
                  </div>
                  <Badge variant={job.state === "picked_up" ? "pending" : "secondary"}>
                    {job.state}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pickup: {job.pickup?.address || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dropoff: {job.dropoff?.address || "N/A"} ({job.dropoff?.city || "N/A"})
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={buildGoogleMapsDirectionsUrl(job, "pickup")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Navigate To Pickup
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={buildGoogleMapsDirectionsUrl(job, "dropoff")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Navigate To Dropoff
                    </a>
                  </Button>
                </div>

                <div className="rounded-lg bg-muted/40 p-2.5 text-xs">
                  <p>
                    Customer:{" "}
                    <span className="font-medium">
                      {job.order?.shippingAddress?.fullName || "N/A"}
                    </span>
                  </p>
                  <p>
                    Contact (masked):{" "}
                    <span className="font-mono">
                      {maskPhone(job.order?.shippingAddress?.phone)}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      disabled={!toDialNumber(CALL_RELAY_NUMBER)}
                    >
                      <a href={`tel:${toDialNumber(CALL_RELAY_NUMBER)}`}>Call Relay</a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      disabled={!toWhatsappNumber(CHAT_RELAY_NUMBER)}
                    >
                      <a
                        href={`https://wa.me/${toWhatsappNumber(CHAT_RELAY_NUMBER)}?text=${encodeURIComponent(
                          `Rider support chat: order ${job.order?.trackingNumber || job._id}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Chat Relay
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {job.state === "accepted" ? (
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        runAction(
                          () => markPickupCompleted(job._id),
                          {
                            id: `pickup-${job._id}-${Date.now()}`,
                            type: "pickup-job",
                            createdAt: Date.now(),
                            payload: { jobId: job._id },
                          },
                          "You are offline. Pickup confirmation was queued.",
                        )
                      }
                    >
                      Confirm Pickup
                    </Button>
                  ) : null}

                  {job.state === "picked_up" ? (
                    <div className="w-full space-y-2 rounded-md border p-2">
                      <Input
                        placeholder="Enter 6-digit OTP"
                        value={otpByJobId[job._id] || ""}
                        onChange={(event) =>
                          setOtpByJobId((prev) => ({
                            ...prev,
                            [job._id]: event.target.value,
                          }))
                        }
                        className="h-9 w-full sm:w-56"
                      />
                      <Input
                        placeholder="Recipient name (required)"
                        value={recipientByJobId[job._id] || ""}
                        onChange={(event) =>
                          setRecipientByJobId((prev) => ({
                            ...prev,
                            [job._id]: event.target.value,
                          }))
                        }
                      />
                      <Textarea
                        placeholder="Delivery note (optional)"
                        value={noteByJobId[job._id] || ""}
                        onChange={(event) =>
                          setNoteByJobId((prev) => ({
                            ...prev,
                            [job._id]: event.target.value,
                          }))
                        }
                        rows={2}
                      />
                      <div className="space-y-2 rounded-lg border border-dashed p-2">
                        <p className="text-xs text-muted-foreground">
                          Proof photo is required before completion.
                        </p>
                        <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-xs">
                          {isUploading ? "Uploading..." : "Upload Proof Photo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              window.sessionStorage.setItem(
                                "rider-proof-upload-job",
                                job._id,
                              );
                              await startUpload([file]);
                              event.target.value = "";
                            }}
                            disabled={isUploading}
                          />
                        </label>
                        {(proofPhotosByJobId[job._id] || []).length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {(proofPhotosByJobId[job._id] || []).map((url) => (
                              <div key={url} className="overflow-hidden rounded border">
                                <Image
                                  src={url}
                                  alt="Proof preview"
                                  width={240}
                                  height={160}
                                  className="h-16 w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={async () => {
                          const currentOtp = (otpByJobId[job._id] || "").trim();
                          const recipientName = (
                            recipientByJobId[job._id] || ""
                          ).trim();
                          const photoUrls = (proofPhotosByJobId[job._id] || []).filter(
                            (url) => isSafeMediaUrl(url),
                          );

                          if (!/^\d{6}$/.test(currentOtp)) {
                            toast.error("Enter a valid 6-digit OTP");
                            return;
                          }
                          if (!recipientName) {
                            toast.error("Recipient name is required");
                            return;
                          }
                          if (photoUrls.length === 0) {
                            toast.error("At least one proof photo is required");
                            return;
                          }

                          const geotag = await getCurrentGeotag();
                          if (!geotag) {
                            toast.error(
                              "Location permission is required for proof of delivery",
                            );
                            return;
                          }

                          const proof: CompletionProofInput = {
                            recipientName,
                            note: noteByJobId[job._id] || "",
                            photoUrls,
                            geotag: {
                              lat: geotag.lat,
                              lng: geotag.lng,
                              accuracyM: geotag.accuracyM,
                            },
                            clientCapturedAt: new Date().toISOString(),
                          };

                          runAction(
                            () => completeDeliveryJob(job._id, currentOtp, undefined, proof),
                            {
                              id: `complete-${job._id}-${Date.now()}`,
                              type: "complete-job",
                              createdAt: Date.now(),
                              payload: {
                                jobId: job._id,
                                otp: currentOtp,
                                proof,
                              },
                            },
                            "You are offline. Delivery completion was queued.",
                          );
                        }}
                      >
                        Complete Delivery
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Offered Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.availableJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active offers assigned to you right now.
            </p>
          ) : (
            data.availableJobs.map((job) => {
              const expiresAtMs = job.offerExpiresAt
                ? new Date(job.offerExpiresAt).getTime()
                : undefined;
              const remainingMs = expiresAtMs ? expiresAtMs - nowMs : undefined;
              const isExpiringSoon =
                remainingMs !== undefined && remainingMs > 0 && remainingMs <= 30000;
              const isExpired = remainingMs !== undefined && remainingMs <= 0;

              return (
                <div key={job._id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">
                      {job.order?.trackingNumber || "No tracking number"}
                    </div>
                    <Badge variant={isExpired ? "secondary" : "outline"}>
                      {isExpired ? "expired" : "offered"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Restaurant: {job.restaurant?.name || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pickup: {job.pickup?.address || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dropoff: {job.dropoff?.address || "N/A"}
                  </p>
                  <div className="rounded-md bg-muted/40 px-2 py-1 text-xs">
                    Offer expires in:{" "}
                    <span
                      className={
                        isExpiringSoon ? "font-semibold text-amber-700" : "font-medium"
                      }
                    >
                      {remainingMs === undefined
                        ? "N/A"
                        : formatOfferCountdown(remainingMs)}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={buildGoogleMapsDirectionsUrl(job, "pickup")}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview Route
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      disabled={isPending || isExpired}
                      onClick={() =>
                        runAction(
                          () => acceptDeliveryJob(job._id),
                          {
                            id: `accept-${job._id}-${Date.now()}`,
                            type: "accept-job",
                            createdAt: Date.now(),
                            payload: { jobId: job._id },
                          },
                          "You are offline. Job acceptance was queued.",
                        )
                      }
                    >
                      Accept Job
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.myRecentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent jobs yet.</p>
          ) : (
            data.myRecentJobs.map((job) => (
              <div
                key={job._id}
                className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{job.order?.trackingNumber || "Order"}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.restaurant?.name || "Restaurant"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{job.state}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(new Date(job.updatedAt || Date.now())).dateTime}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
