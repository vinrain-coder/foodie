"use client";

import { useEffect, useState } from "react";
import { updateRestaurantApplicationStatus } from "@/lib/actions/restaurant.actions";
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
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    setList(applications);
  }, [applications]);

  async function handleStatusUpdate(
    id: string,
    status: "approved" | "rejected",
    note?: string,
  ) {
    setIsUpdating(id);
    const res = await updateRestaurantApplicationStatus(id, status, note);
    setIsUpdating(null);

    if (res.success) {
      toast.success(res.message);
      setList((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                status,
                isApproved: status === "approved",
                isActive: status === "approved",
                adminNote:
                  status === "rejected"
                    ? note || item.adminNote || ""
                    : item.adminNote || "",
              }
            : item,
        ),
      );
      setRejectionReason("");
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
                      {item.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            disabled={isUpdating === item._id}
                            onClick={() =>
                              handleStatusUpdate(item._id, "approved")
                            }
                          >
                            {isUpdating === item._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Approve"
                            )}
                          </Button>

                          <Dialog
                            onOpenChange={(open) =>
                              !open && setRejectionReason("")
                            }
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
                                  value={rejectionReason}
                                  onChange={(e) =>
                                    setRejectionReason(e.target.value)
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
                                      rejectionReason,
                                    )
                                  }
                                  disabled={
                                    !rejectionReason.trim() ||
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
