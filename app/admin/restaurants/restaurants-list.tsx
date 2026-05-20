"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  updateRestaurantActivationStatus,
  updateRestaurantApplicationStatus,
} from "@/lib/actions/restaurant.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    setList(applications);
  }, [applications]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalApplications === 0
            ? "No restaurant applications found"
            : `Showing ${applications.length} of ${totalApplications} applications`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No restaurant applications found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                      <div className="font-medium flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        /{item.slug}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {item.ownerId?.name || "Unknown owner"}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
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
                        className="flex items-center gap-1 w-fit"
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
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          Note: {item.adminNote}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild size="sm" variant="outline" disabled={isUpdating === item._id}>
                        <Link href={`/admin/restaurants/${item._id}`}>Edit</Link>
                      </Button>
                      {item.status === "pending" && (
                        <>
                          <ConfirmStatusActionButton
                            label="Approve"
                            variant="default"
                            pending={isUpdating === item._id}
                            disabled={isUpdating === item._id}
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
                                disabled={isUpdating === item._id}
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
                                  Please provide a reason for rejection. This
                                  note is mandatory.
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
                                    isUpdating === item._id
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
                            disabled={isUpdating === item._id}
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
                            disabled={isUpdating === item._id}
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
                            disabled={isUpdating === item._id}
                            title="Approve this rejected application?"
                            description="This will approve and activate the restaurant."
                            onConfirm={() => handleStatusUpdate(item._id, "approved")}
                          />
                          <ConfirmStatusActionButton
                            label="Re-open"
                            variant="outline"
                            pending={isUpdating === item._id}
                            disabled={isUpdating === item._id}
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
