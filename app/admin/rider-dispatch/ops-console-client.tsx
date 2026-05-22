"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignDeliveryJobManually, emergencyCancelDeliveryJob } from "@/lib/actions/rider.actions";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function stateBadgeVariant(
  state?: string,
): "secondary" | "pending" | "success" | "outline" {
  if (state === "delivered") return "success";
  if (state === "picked_up" || state === "accepted" || state === "offered") {
    return "pending";
  }
  if (state === "cancelled" || state === "failed") return "outline";
  return "secondary";
}

function availabilityBadgeVariant(
  state?: string,
): "secondary" | "pending" | "success" | "outline" {
  if (state === "on_trip") return "pending";
  if (state === "idle") return "success";
  if (state === "offline") return "outline";
  return "secondary";
}

function riskBadgeVariant(
  risk?: string,
): "secondary" | "pending" | "success" | "outline" {
  if (risk === "high") return "outline";
  if (risk === "medium") return "pending";
  return "success";
}

function pct(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function OpsConsoleClient({ data }: { data: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRiderByJob, setSelectedRiderByJob] = useState<Record<string, string>>({});

  const summaryMap = useMemo(
    () => Object.fromEntries((data.jobSummary || []).map((item: any) => [item._id, item.count])),
    [data.jobSummary],
  );

  const mapPoints = useMemo(() => {
    const points = (data.riderPositions || [])
      .filter(
        (rider: any) =>
          Number.isFinite(rider?.currentLocation?.lat) &&
          Number.isFinite(rider?.currentLocation?.lng),
      )
      .map((rider: any) => ({
        riderId: rider?.user?._id || rider?._id,
        riderName: rider?.user?.name || "Rider",
        availability: rider?.availability || "offline",
        riskLevel: rider?.riskLevel || "low",
        lat: Number(rider.currentLocation.lat),
        lng: Number(rider.currentLocation.lng),
      }));
    return points;
  }, [data.riderPositions]);

  const mapBounds = useMemo(() => {
    if (mapPoints.length === 0) {
      return { minLat: -4.9, maxLat: 5.1, minLng: 33.8, maxLng: 42.1 };
    }
    const lats = mapPoints.map((point: any) => point.lat);
    const lngs = mapPoints.map((point: any) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      minLat: minLat - 0.03,
      maxLat: maxLat + 0.03,
      minLng: minLng - 0.03,
      maxLng: maxLng + 0.03,
    };
  }, [mapPoints]);

  const toMapPosition = (lat: number, lng: number) => {
    const x = ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng || 1)) * 100;
    const y = ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat || 1)) * 100;
    return {
      left: `${Math.max(2, Math.min(98, x)).toFixed(2)}%`,
      top: `${Math.max(2, Math.min(98, y)).toFixed(2)}%`,
    };
  };

  const runManualReassign = (jobId: string) => {
    const riderUserId = selectedRiderByJob[jobId];
    if (!riderUserId) {
      toast.error("Select a rider first");
      return;
    }
    startTransition(async () => {
      const response = await assignDeliveryJobManually(jobId, riderUserId);
      if (!response.success) {
        toast.error(response.message || "Failed to reassign job");
        return;
      }
      toast.success(response.message || "Job manually reassigned");
      router.refresh();
    });
  };

  const runEmergencyCancel = (jobId: string) => {
    const reason = window.prompt(
      "Emergency cancel reason (required for audit):",
      "Ops safety intervention",
    );
    if (!reason || !reason.trim()) return;

    startTransition(async () => {
      const response = await emergencyCancelDeliveryJob(jobId, reason.trim());
      if (!response.success) {
        toast.error(response.message || "Failed to emergency cancel");
        return;
      }
      toast.success(response.message || "Delivery emergency-cancelled");
      router.refresh();
    });
  };

  const assignmentQueue = [
    ...(data.escalatedJobs || []),
    ...(data.unassignedJobs || []),
  ].slice(0, 80);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Unassigned</p>
            <p className="text-base font-semibold">{summaryMap.unassigned || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Offered</p>
            <p className="text-base font-semibold">{summaryMap.offered || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Accepted</p>
            <p className="text-base font-semibold">{summaryMap.accepted || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Picked Up</p>
            <p className="text-base font-semibold">{summaryMap.picked_up || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Delayed</p>
            <p className="text-base font-semibold">{data?.sla?.delayedJobs || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Delivered</p>
            <p className="text-base font-semibold">{summaryMap.delivered || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Failed/Cancelled</p>
            <p className="text-base font-semibold">
              {(summaryMap.failed || 0) + (summaryMap.cancelled || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live Rider Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-72 overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_20%_20%,#eff6ff_0%,#f8fafc_40%,#eef2ff_100%)]">
            {mapPoints.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No rider location pings available yet.
              </div>
            ) : (
              mapPoints.map((point: any) => {
                const pos = toMapPosition(point.lat, point.lng);
                return (
                  <div
                    key={point.riderId}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: pos.left, top: pos.top }}
                    title={`${point.riderName} (${point.availability})`}
                  >
                    <div
                      className={`h-3.5 w-3.5 rounded-full ring-2 ring-white ${
                        point.availability === "on_trip"
                          ? "bg-amber-500"
                          : point.riskLevel === "high"
                            ? "bg-rose-500"
                            : point.availability === "idle"
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Markers: green idle, amber on-trip, gray offline, red high-risk.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SLA Dashboard (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Avg Assign Time</p>
              <p className="text-lg font-semibold">{data.sla?.averageAssignMinutes || 0} min</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Avg Pickup Delay</p>
              <p className="text-lg font-semibold">
                {data.sla?.averagePickupDelayMinutes || 0} min
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Avg Delivery Delay</p>
              <p className="text-lg font-semibold">
                {data.sla?.averageDeliveryDelayMinutes || 0} min
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <p className="text-lg font-semibold">{pct(data.sla?.completionRate || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rider Fleet Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data.riderPositions || []).slice(0, 10).map((rider: any) => (
              <div key={rider._id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <p className="font-medium">{rider.user?.name || "Rider"}</p>
                  <p className="text-xs text-muted-foreground">{rider.user?.email || "-"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={availabilityBadgeVariant(rider.availability)}>
                    {rider.availability}
                  </Badge>
                  <Badge variant={riskBadgeVariant(rider.riskLevel)}>{rider.riskLevel}</Badge>
                </div>
              </div>
            ))}
            {(data.riderPositions || []).length === 0 ? (
              <p className="text-muted-foreground">No riders found.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Jobs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Promised By</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.activeJobs || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No active jobs.
                  </TableCell>
                </TableRow>
              ) : (
                (data.activeJobs || []).map((job: any) => (
                  <TableRow key={job._id}>
                    <TableCell className="font-medium">
                      {job.order?.trackingNumber || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stateBadgeVariant(job.state)}>{job.state}</Badge>
                    </TableCell>
                    <TableCell>{job.rider?.name || "Unassigned"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.promisedBy
                        ? formatDateTime(new Date(job.promisedBy)).dateTime
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.updatedAt
                        ? formatDateTime(new Date(job.updatedAt)).dateTime
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => runEmergencyCancel(job._id)}
                      >
                        Emergency Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manual Reassignment Queue</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Assign Rider</TableHead>
                <TableHead className="w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignmentQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No jobs waiting for manual assignment.
                  </TableCell>
                </TableRow>
              ) : (
                assignmentQueue.map((job: any) => (
                  <TableRow key={job._id}>
                    <TableCell className="font-medium">
                      {job.order?.trackingNumber || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stateBadgeVariant(job.state)}>{job.state}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                      {job.manualAssignmentReason || job.failureReason || "Manual assignment"}
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-9 w-56 rounded-md border bg-background px-2 text-sm"
                        value={selectedRiderByJob[job._id] || ""}
                        onChange={(event) =>
                          setSelectedRiderByJob((prev) => ({
                            ...prev,
                            [job._id]: event.target.value,
                          }))
                        }
                        disabled={isPending}
                      >
                        <option value="">Select eligible rider</option>
                        {(data.eligibleRiders || []).map((rider: any) => (
                          <option key={rider.user?._id} value={rider.user?._id}>
                            {rider.user?.name || "Rider"} ({rider.availability || "idle"})
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => runManualReassign(job._id)}
                        >
                          Reassign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => runEmergencyCancel(job._id)}
                        >
                          Emergency Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delayed Jobs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Promised By</TableHead>
                <TableHead>Delay</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.delayedJobs || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No delayed jobs.
                  </TableCell>
                </TableRow>
              ) : (
                (data.delayedJobs || []).map((job: any) => {
                  const promised = job.promisedBy ? new Date(job.promisedBy).getTime() : null;
                  const delayMin = promised
                    ? Math.max(0, Math.round((Date.now() - promised) / 60000))
                    : 0;
                  return (
                    <TableRow key={job._id}>
                      <TableCell className="font-medium">
                        {job.order?.trackingNumber || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stateBadgeVariant(job.state)}>{job.state}</Badge>
                      </TableCell>
                      <TableCell>{job.rider?.name || "Unassigned"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {job.promisedBy
                          ? formatDateTime(new Date(job.promisedBy)).dateTime
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-xs">{delayMin} min</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => runEmergencyCancel(job._id)}
                        >
                          Emergency Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rider Performance Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider</TableHead>
                <TableHead>Acceptance Rate</TableHead>
                <TableHead>On-Time %</TableHead>
                <TableHead>Cancellations</TableHead>
                <TableHead>Complaints</TableHead>
                <TableHead>Delivered (30d)</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.riderPerformance || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No rider performance data.
                  </TableCell>
                </TableRow>
              ) : (
                (data.riderPerformance || []).map((item: any) => (
                  <TableRow key={item.riderId}>
                    <TableCell>
                      <p className="font-medium">{item.riderName || "Rider"}</p>
                      <p className="text-xs text-muted-foreground">{item.riderEmail || "-"}</p>
                    </TableCell>
                    <TableCell>{pct(item.acceptanceRate)}</TableCell>
                    <TableCell>{pct(item.onTimePct)}</TableCell>
                    <TableCell>{item.cancellations || 0}</TableCell>
                    <TableCell>{item.complaints || 0}</TableCell>
                    <TableCell>{item.delivered || 0}</TableCell>
                    <TableCell>
                      <Badge variant={riskBadgeVariant(item.riskLevel)}>
                        {item.riskLevel || "low"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
