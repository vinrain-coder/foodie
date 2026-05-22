import { connection } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { canAccessAdminDashboard } from "@/lib/dashboard-access";
import { hitTrackingLookupLimit } from "@/lib/tracking-rate-limit";
import {
  getLiveTrackingSnapshotByTrackingNumber,
  LiveTrackingViewer,
} from "@/lib/tracking/live-tracking";

const POLL_INTERVAL_MS = 5000;
const KEEPALIVE_INTERVAL_MS = 15000;

function toSseChunk(event: string, payload: unknown, eventId: number) {
  return `id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> },
) {
  await connection();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";
  const limit = hitTrackingLookupLimit(ip);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        message: "Too many tracking requests. Please retry shortly.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  const { trackingNumber } = await params;
  const normalizedTrackingNumber = decodeURIComponent(trackingNumber)
    .trim()
    .toUpperCase();
  if (!/^TRK-[A-Z0-9-]{8,40}$/.test(normalizedTrackingNumber)) {
    return new Response(JSON.stringify({ message: "Invalid tracking number." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await getServerSession();
  const viewer: LiveTrackingViewer = canAccessAdminDashboard(session?.user?.role)
    ? "staff"
    : "public";

  const encoder = new TextEncoder();
  let eventId = 0;
  let lastSignature = "";
  let pollingTimer: ReturnType<typeof setInterval> | undefined;
  let keepaliveTimer: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pollingTimer) clearInterval(pollingTimer);
        if (keepaliveTimer) clearInterval(keepaliveTimer);
      };

      const emit = (event: string, payload: unknown) => {
        eventId += 1;
        controller.enqueue(encoder.encode(toSseChunk(event, payload, eventId)));
      };

      const poll = async () => {
        try {
          const snapshot = await getLiveTrackingSnapshotByTrackingNumber(
            normalizedTrackingNumber,
            viewer,
          );
          if (!snapshot) {
            emit("tracking.error", { message: "Tracking number not found" });
            cleanup();
            controller.close();
            return;
          }

          const signature = JSON.stringify({
            status: snapshot.status,
            updatedAt: snapshot.updatedAt,
            heartbeatAt: snapshot.live.heartbeatAt,
            routeDeviationM: snapshot.live.routeDeviationM,
            etaDriftMinutes: snapshot.live.etaDriftMinutes,
            latestAlertFlags: snapshot.live.latestAlertFlags,
          });
          if (signature !== lastSignature) {
            lastSignature = signature;
            emit("tracking.update", snapshot);
          }
        } catch (error) {
          emit("tracking.error", {
            message:
              (error as { message?: string })?.message ||
              "Failed to stream tracking updates",
          });
        }
      };

      void poll();
      pollingTimer = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);

      keepaliveTimer = setInterval(() => {
        controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
      }, KEEPALIVE_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        cleanup();
        controller.close();
      });
    },
    cancel() {
      closed = true;
      if (pollingTimer) clearInterval(pollingTimer);
      if (keepaliveTimer) clearInterval(keepaliveTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
