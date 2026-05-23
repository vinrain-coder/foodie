"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  User as UserIcon,
} from "lucide-react";

import { bulkModerateRidersByAdmin } from "@/lib/actions/rider-profile.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RiderListItem = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  vehicleType: string;
  location: string;
  status: string;
  isKycVerified: boolean;
  availability: string;
  completedJobs: number;
  rating: number;
  acceptanceRate: number;
  kycVerifiedAt?: string;
  createdAt: string;
};

function statusBadge(status: string, isKycVerified: boolean) {
  if (isKycVerified) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40"
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge
        variant="outline"
        className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Suspended
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40"
    >
      <Clock3 className="mr-1 h-3 w-3" />
      Pending KYC
    </Badge>
  );
}

export default function RidersManagementClient({
  riders,
}: {
  riders: RiderListItem[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "suspend" | "reactivate" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const selectableIds = useMemo(
    () => riders.map((rider) => rider.userId).filter(Boolean),
    [riders],
  );
  const selectedCount = selectedIds.length;
  const allSelected =
    selectableIds.length > 0 && selectedCount === selectableIds.length;
  const someSelected =
    selectedCount > 0 && selectedCount < selectableIds.length;

  const toggleAll = (next: boolean) => {
    if (next) {
      setSelectedIds(selectableIds);
      return;
    }
    setSelectedIds([]);
  };

  const toggleOne = (riderUserId: string, next: boolean) => {
    if (!riderUserId) return;
    setSelectedIds((current) => {
      if (next) {
        if (current.includes(riderUserId)) return current;
        return [...current, riderUserId];
      }
      return current.filter((id) => id !== riderUserId);
    });
  };

  const handleBulkAction = (action: "suspend" | "reactivate") => {
    const trimmedReason = bulkReason.trim();
    if (selectedIds.length === 0) {
      toast.error("Select at least one rider first.");
      return;
    }
    if (trimmedReason.length < 5) {
      toast.error("Bulk action reason must be at least 5 characters.");
      return;
    }

    setPendingAction(action);
    startTransition(async () => {
      try {
        const result = await bulkModerateRidersByAdmin({
          riderUserIds: selectedIds,
          action,
          reason: trimmedReason,
        });
        if (!result.success) {
          toast.error(result.message || "Failed to run bulk rider action.");
          return;
        }

        toast.success(result.message || `Bulk ${action} completed.`);
        if ((result.data?.failed || 0) > 0) {
          const firstFailure = result.data?.failures?.[0];
          if (firstFailure) {
            toast.info(`First failure: ${firstFailure.reason}`);
          }
        }
        setSelectedIds([]);
        setBulkReason("");
      } catch {
        toast.error("Unexpected error while running bulk rider action.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Rider Directory</CardTitle>
          <CardDescription>
            Select multiple riders to run bulk suspend/reactivate with audit logging.
          </CardDescription>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <p className="text-sm">
            <span className="font-medium">{selectedCount}</span> rider(s) selected
          </p>
          <Textarea
            value={bulkReason}
            onChange={(event) => setBulkReason(event.target.value)}
            placeholder="Reason for bulk action (required, minimum 5 characters)"
            rows={2}
            disabled={isPending}
          />
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Suspend Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend selected riders?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will set selected riders to suspended and force availability
                    to offline when eligible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkAction("suspend")}
                    disabled={isPending}
                  >
                    {isPending && pendingAction === "suspend" ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      "Confirm Suspend"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Reactivate Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reactivate selected riders?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Suspended riders will be moved back to active or pending KYC based
                    on their verification state.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkAction("reactivate")}
                    disabled={isPending}
                  >
                    {isPending && pendingAction === "reactivate" ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      "Confirm Reactivate"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {riders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <UserIcon className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No riders registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(value) => toggleAll(value === true)}
                      aria-label="Select all riders"
                    />
                  </TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riders.map((rider) => {
                  const riderUserId = rider.userId || "";
                  const isSelected = selectedIds.includes(riderUserId);
                  const isSelectable = Boolean(riderUserId);

                  return (
                    <TableRow key={rider._id}>
                      <TableCell>
                        <Checkbox
                          checked={isSelectable ? isSelected : false}
                          disabled={!isSelectable || isPending}
                          onCheckedChange={(value) =>
                            toggleOne(riderUserId, value === true)
                          }
                          aria-label={`Select ${rider.fullName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rider.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {rider.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{rider.phone || "-"}</TableCell>
                      <TableCell className="capitalize">{rider.vehicleType}</TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {rider.location || "-"}
                      </TableCell>
                      <TableCell>{statusBadge(rider.status, rider.isKycVerified)}</TableCell>
                      <TableCell>{rider.completedJobs}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            rider.rating >= 4
                              ? "default"
                              : rider.rating >= 3
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {Number(rider.rating).toFixed(1)} / 5
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost" className="h-8">
                          <Link href={`/admin/riders/${rider.userId || rider._id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
