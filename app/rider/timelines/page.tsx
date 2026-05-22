import { Metadata } from "next";
import Breadcrumb from "@/components/shared/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRiderDispatchTimeline } from "@/lib/actions/rider.actions";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Rider Timelines",
};

function stateBadgeVariant(state?: string): "secondary" | "pending" | "success" | "outline" {
  if (state === "delivered") return "success";
  if (state === "picked_up" || state === "accepted" || state === "offered") {
    return "pending";
  }
  if (state === "cancelled" || state === "failed") return "outline";
  return "secondary";
}

export default async function RiderTimelinesPage() {
  const data = await getRiderDispatchTimeline();

  return (
    <div className="space-y-4">
      <Breadcrumb />
      <div>
        <h1 className="h1-bold">Dispatch & Proof Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Inspect assignment events, proof of delivery records, and job state history.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Rider status</p>
            <p className="text-base font-semibold">{data.rider.status}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Availability</p>
            <p className="text-base font-semibold">{data.rider.availability}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Proof records</p>
            <p className="text-base font-semibold">{data.proofs.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dispatch Events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Job State</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No dispatch events yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.events.map((event: any) => (
                  <TableRow key={event._id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(new Date(event.createdAt)).dateTime}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.eventType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {event.order?.trackingNumber || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stateBadgeVariant(event.deliveryJob?.state)}>
                        {event.deliveryJob?.state || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                      {event.reason || "—"}
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
          <CardTitle className="text-base">Proof Of Delivery</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivered At</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>OTP</TableHead>
                <TableHead>Geo</TableHead>
                <TableHead>Recipient</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.proofs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No proof records yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.proofs.map((proof: any) => (
                  <TableRow key={proof._id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(new Date(proof.deliveredAt)).dateTime}
                    </TableCell>
                    <TableCell className="font-medium">
                      {proof.order?.trackingNumber || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{proof.verificationMethod}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {proof.otpMasked || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {Number.isFinite(proof.geotag?.lat) &&
                      Number.isFinite(proof.geotag?.lng)
                        ? `${Number(proof.geotag.lat).toFixed(5)}, ${Number(proof.geotag.lng).toFixed(5)}`
                        : "—"}
                    </TableCell>
                    <TableCell>{proof.recipientName || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Job State Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rider jobs found.</p>
          ) : (
            data.jobs.map((job: any) => (
              <div key={job._id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {job.order?.trackingNumber || "No tracking"}
                  </p>
                  <Badge variant={stateBadgeVariant(job.state)}>{job.state}</Badge>
                </div>
                <div className="space-y-1">
                  {(job.statusTimeline || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No timeline events.</p>
                  ) : (
                    (job.statusTimeline || []).map((entry: any, index: number) => (
                      <div key={`${job._id}-${entry.at}-${index}`} className="flex items-start justify-between gap-3 text-xs">
                        <div>
                          <span className="font-medium">{entry.state}</span>
                          <span className="text-muted-foreground"> by {entry.actor}</span>
                          {entry.note ? (
                            <p className="text-muted-foreground">{entry.note}</p>
                          ) : null}
                        </div>
                        <span className="text-muted-foreground">
                          {formatDateTime(new Date(entry.at)).dateTime}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
