"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  bulkModerateRestaurantsByAdmin,
  deleteRestaurantByAdmin,
  updateRestaurantActivationStatus,
  updateRestaurantApplicationStatus,
} from "@/lib/actions/restaurant.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Store,
  Mail,
  MapPin,
} from "lucide-react";
import Pagination from "@/components/shared/pagination";

type RestaurantApplicationRow = {
  _id: string;
  name: string;
  slug: string;
  location: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  isApproved: boolean;
  isActive: boolean;
  adminNote?: string;
  createdAt: string;
  ownerId?: {
    name?: string;
    email?: string;
    _id?: string;
  };
};

type BulkRestaurantAction =
  | "approve"
  | "reject"
  | "set_pending"
  | "activate"
  | "suspend";

function ConfirmStatusActionButton({
  label,
  pending,
  disabled,
  onConfirm,
  title,
  description,
  variant = "default",
}: {
  label: string;
  pending: boolean;
  disabled: boolean;
  onConfirm: () => void;
  title: string;
  description: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} disabled={disabled}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? "Processing..." : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function RestaurantApplicationsList({
  applications,
  totalPages,
  currentPage,
  totalApplications,
}: {
  applications: RestaurantApplicationRow[];
  totalPages: number;
  currentPage: number;
  totalApplications: number;
}) {
  const [list, setList] = useState(applications);
  const [totalCount, setTotalCount] = useState(totalApplications);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAdminNote, setBulkAdminNote] = useState("");
  const [pendingBulkAction, setPendingBulkAction] =
    useState<BulkRestaurantAction | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();

  useEffect(() => {
    setList(applications);
    setTotalCount(totalApplications);
    setSelectedIds([]);
    setBulkAdminNote("");
  }, [applications, totalApplications]);

  const selectableIds = useMemo(() => list.map((item) => item._id), [list]);
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

  const toggleOne = (id: string, next: boolean) => {
    setSelectedIds((current) => {
      if (next) {
        if (current.includes(id)) return current;
        return [...current, id];
      }
      return current.filter((value) => value !== id);
    });
  };

  async function handleStatusUpdate(
    id: string,
    status: "approved" | "rejected" | "pending",
    note?: string,
  ) {
    setIsUpdating(id);
    const res = await updateRestaurantApplicationStatus(id, status, note);
    setIsUpdating(null);

    if (res.success) {
      const updated = (res.data || {}) as Partial<RestaurantApplicationRow>;
      toast.success(res.message);
      setList((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                status: updated.status || status,
                isApproved:
                  typeof updated.isApproved === "boolean"
                    ? updated.isApproved
                    : status === "approved",
                isActive:
                  typeof updated.isActive === "boolean"
                    ? updated.isActive
                    : status === "approved",
                adminNote:
                  typeof updated.adminNote === "string"
                    ? updated.adminNote
                    : note?.trim() || item.adminNote || "",
              }
            : item,
        ),
      );
      setNotesById((prev) => ({ ...prev, [id]: "" }));
    } else {
      toast.error(res.message);
    }
  }

  async function handleActivationUpdate(
    id: string,
    isActive: boolean,
    note?: string,
  ) {
    setIsUpdating(id);
    const res = await updateRestaurantActivationStatus(id, isActive, note);
    setIsUpdating(null);

    if (res.success) {
      const updated = (res.data || {}) as Partial<RestaurantApplicationRow>;
      toast.success(res.message);
      setList((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                isActive:
                  typeof updated.isActive === "boolean"
                    ? updated.isActive
                    : isActive,
                adminNote:
                  typeof updated.adminNote === "string"
                    ? updated.adminNote
                    : note?.trim() || item.adminNote || "",
              }
            : item,
        ),
      );
      setNotesById((prev) => ({ ...prev, [id]: "" }));
    } else {
      toast.error(res.message);
    }
  }

  async function handleDeleteRestaurant(id: string) {
    setIsDeleting(id);
    const res = await deleteRestaurantByAdmin(id);
    setIsDeleting(null);

    if (res.success) {
      toast.success(res.message);
      setList((prev) => prev.filter((item) => item._id !== id));
      setSelectedIds((prev) => prev.filter((value) => value !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } else {
      toast.error(res.message);
    }
  }

  const applyBulkMutation = (
    action: BulkRestaurantAction,
    ids: string[],
    adminNote: string,
  ) => {
    const idSet = new Set(ids);
    const trimmedNote = adminNote.trim();

    setList((prev) =>
      prev.map((item) => {
        if (!idSet.has(item._id)) return item;

        if (action === "approve") {
          return {
            ...item,
            status: "approved",
            isApproved: true,
            isActive: true,
            adminNote: trimmedNote,
          };
        }

        if (action === "reject") {
          return {
            ...item,
            status: "rejected",
            isApproved: false,
            isActive: false,
            adminNote: trimmedNote,
          };
        }

        if (action === "set_pending") {
          return {
            ...item,
            status: "pending",
            isApproved: false,
            isActive: false,
            adminNote: trimmedNote,
          };
        }

        if (action === "activate") {
          return {
            ...item,
            isActive: true,
            adminNote: trimmedNote || item.adminNote || "",
          };
        }

        return {
          ...item,
          isActive: false,
          adminNote: trimmedNote || item.adminNote || "",
        };
      }),
    );
  };

  const handleBulkAction = (action: BulkRestaurantAction) => {
    const trimmedNote = bulkAdminNote.trim();
    if (selectedIds.length === 0) {
      toast.error("Select at least one restaurant first.");
      return;
    }
    if (action === "reject" && trimmedNote.length === 0) {
      toast.error("Provide a rejection reason for bulk reject.");
      return;
    }

    setPendingBulkAction(action);
    startBulkTransition(async () => {
      try {
        const result = await bulkModerateRestaurantsByAdmin({
          restaurantIds: selectedIds,
          action,
          adminNote: trimmedNote,
        });

        if (!result.success) {
          toast.error(result.message || "Failed to run bulk restaurant action.");
          return;
        }

        toast.success(result.message || `Bulk ${action} completed.`);
        const failedIds = new Set(
          (result.data?.failures || []).map((failure) => failure.restaurantId),
        );
        const successfulIds = selectedIds.filter((id) => !failedIds.has(id));

        if (successfulIds.length > 0) {
          applyBulkMutation(action, successfulIds, trimmedNote);
        }
        if ((result.data?.failed || 0) > 0) {
          const firstFailure = result.data?.failures?.[0];
          if (firstFailure) {
            toast.info(`First failure: ${firstFailure.reason}`);
          }
        }

        setSelectedIds([]);
        setBulkAdminNote("");
      } catch {
        toast.error("Unexpected error while running bulk restaurant action.");
      } finally {
        setPendingBulkAction(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "No restaurant applications found"
            : `Showing ${list.length} of ${totalCount} applications`}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-sm">
          <span className="font-medium">{selectedCount}</span> restaurant(s)
          selected
        </p>
        <Textarea
          value={bulkAdminNote}
          onChange={(event) => setBulkAdminNote(event.target.value)}
          placeholder="Optional admin note (required for bulk reject)"
          rows={2}
          disabled={isBulkPending}
        />
        <div className="flex flex-wrap gap-2">
          <ConfirmStatusActionButton
            label="Approve Selected"
            pending={isBulkPending && pendingBulkAction === "approve"}
            disabled={isBulkPending || selectedCount === 0}
            title="Approve selected restaurants?"
            description="Selected applications will be approved and activated."
            onConfirm={() => handleBulkAction("approve")}
          />
          <ConfirmStatusActionButton
            label="Reject Selected"
            variant="destructive"
            pending={isBulkPending && pendingBulkAction === "reject"}
            disabled={
              isBulkPending || selectedCount === 0 || bulkAdminNote.trim() === ""
            }
            title="Reject selected restaurants?"
            description="Selected applications will be rejected. A note is required."
            onConfirm={() => handleBulkAction("reject")}
          />
          <ConfirmStatusActionButton
            label="Set Pending"
            variant="outline"
            pending={isBulkPending && pendingBulkAction === "set_pending"}
            disabled={isBulkPending || selectedCount === 0}
            title="Move selected restaurants to pending?"
            description="This removes approval state and marks selected restaurants for review."
            onConfirm={() => handleBulkAction("set_pending")}
          />
          <ConfirmStatusActionButton
            label="Activate Selected"
            pending={isBulkPending && pendingBulkAction === "activate"}
            disabled={isBulkPending || selectedCount === 0}
            title="Activate selected restaurants?"
            description="Only approved restaurants will be activated for storefront ordering."
            onConfirm={() => handleBulkAction("activate")}
          />
          <ConfirmStatusActionButton
            label="Suspend Selected"
            variant="secondary"
            pending={isBulkPending && pendingBulkAction === "suspend"}
            disabled={isBulkPending || selectedCount === 0}
            title="Suspend selected restaurants?"
            description="Only approved restaurants will be suspended from storefront ordering."
            onConfirm={() => handleBulkAction("suspend")}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No restaurant applications found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(value) => toggleAll(value === true)}
                      disabled={isBulkPending}
                      aria-label="Select all restaurants"
                    />
                  </TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(item._id)}
                        disabled={
                          isBulkPending ||
                          isUpdating === item._id ||
                          isDeleting === item._id
                        }
                        onCheckedChange={(value) =>
                          toggleOne(item._id, value === true)
                        }
                        aria-label={`Select ${item.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        /{item.slug}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {item.ownerId?.name || "Unknown owner"}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {item.ownerId?.email || "No email"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "approved"
                            ? "success"
                            : item.status === "pending"
                              ? "pending"
                              : "destructive"
                        }
                        className="flex w-fit items-center gap-1"
                      >
                        {item.status === "approved" && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {item.status === "pending" && (
                          <Clock className="h-3 w-3" />
                        )}
                        {item.status === "rejected" && (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {item.status.toUpperCase()}
                      </Badge>
                      {item.status === "approved" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Operational:{" "}
                          <span
                            className={
                              item.isActive ? "text-emerald-600" : "text-amber-600"
                            }
                          >
                            {item.isActive ? "Active" : "Suspended"}
                          </span>
                        </p>
                      )}
                      {item.adminNote ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          Note: {item.adminNote}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        disabled={
                          isBulkPending ||
                          isUpdating === item._id ||
                          isDeleting === item._id
                        }
                      >
                        <Link href={`/admin/restaurants/${item._id}`}>Edit</Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={
                              isBulkPending ||
                              isUpdating === item._id ||
                              isDeleting === item._id
                            }
                          >
                            {isDeleting === item._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this restaurant?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the restaurant and all of its menu
                              items. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting === item._id}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRestaurant(item._id)}
                              disabled={isDeleting === item._id}
                            >
                              {isDeleting === item._id
                                ? "Deleting..."
                                : "Yes, delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {item.status === "pending" && (
                        <>
                          <ConfirmStatusActionButton
                            label="Approve"
                            variant="default"
                            pending={isUpdating === item._id}
                            disabled={isUpdating === item._id || isBulkPending}
                            title="Approve restaurant application?"
                            description="This will approve this restaurant and make it active immediately."
                            onConfirm={() => handleStatusUpdate(item._id, "approved")}
                          />

                          <Dialog
                            onOpenChange={(open) => {
                              if (!open) {
                                setNotesById((prev) => ({
                                  ...prev,
                                  [item._id]: "",
                                }));
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isUpdating === item._id || isBulkPending}
                              >
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Reject Restaurant Application
                                </DialogTitle>
                                <DialogDescription>
                                  Please provide a reason for rejection. This note is
                                  mandatory.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Textarea
                                  placeholder="Reason for rejection..."
                                  value={notesById[item._id] || ""}
                                  onChange={(e) =>
                                    setNotesById((prev) => ({
                                      ...prev,
                                      [item._id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      item._id,
                                      "rejected",
                                      notesById[item._id],
                                    )
                                  }
                                  disabled={
                                    !(notesById[item._id] || "").trim() ||
                                    isUpdating === item._id ||
                                    isBulkPending
                                  }
                                >
                                  {isUpdating === item._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Confirm Reject"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      {item.status === "approved" && (
                        <>
                          <ConfirmStatusActionButton
                            label={item.isActive ? "Suspend" : "Activate"}
                            variant={item.isActive ? "secondary" : "default"}
                            pending={isUpdating === item._id}
                            disabled={isUpdating === item._id || isBulkPending}
                            title={
                              item.isActive
                                ? "Suspend this restaurant?"
                                : "Activate this restaurant?"
                            }
                            description={
                              item.isActive
                                ? "This restaurant will be hidden from storefront ordering until reactivated."
                                : "This restaurant will become available for storefront ordering."
                            }
                            onConfirm={() =>
                              handleActivationUpdate(item._id, !item.isActive)
                            }
                          />
                          <ConfirmStatusActionButton
                            label="Set Pending"
                            variant="outline"
                            pending={isUpdating === item._id}
                            disabled={isUpdating === item._id || isBulkPending}
                            title="Move this restaurant back to pending?"
                            description="This removes current approval state and marks it for review again."
                            onConfirm={() => handleStatusUpdate(item._id, "pending")}
                          />
                        </>
                      )}
                      {item.status === "rejected" && (
                        <>
                          <ConfirmStatusActionButton
                            label="Approve"
                            variant="default"
                            pending={isUpdating === item._id}
                            disabled={isUpdating === item._id || isBulkPending}
                            title="Approve this rejected application?"
                            description="This will approve and activate the restaurant."
                            onConfirm={() => handleStatusUpdate(item._id, "approved")}
                          />
                          <ConfirmStatusActionButton
                            label="Re-open"
                            variant="outline"
                            pending={isUpdating === item._id}
                            disabled={isUpdating === item._id || isBulkPending}
                            title="Re-open this application?"
                            description="This will set the restaurant status to pending for another review."
                            onConfirm={() => handleStatusUpdate(item._id, "pending")}
                          />
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination page={currentPage.toString()} totalPages={totalPages} />
      )}
    </div>
  );
}
