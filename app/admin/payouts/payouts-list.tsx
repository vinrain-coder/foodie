"use client";

import { useState } from "react";
import {
  updatePayoutStatus,
  deletePayoutRequest,
} from "@/lib/actions/affiliate.actions";
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
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
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
  Wallet,
  DollarSign,
  Building2,
  Inbox,
} from "lucide-react";
import DeleteDialog from "@/components/shared/delete-dialog";
import Pagination from "@/components/shared/pagination";
import { useEffect } from "react";

export default function PayoutsAdminPage({
  payouts,
  totalPages,
  currentPage,
  totalPayouts,
}: {
  payouts: any[];
  totalPages: number;
  currentPage: number;
  totalPayouts: number;
}) {
  const [list, setList] = useState(payouts);

  useEffect(() => {
    setList(payouts);
  }, [payouts]);

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  async function handleStatusUpdate(id: string, status: "paid" | "rejected") {
    setIsUpdating(id);
    const res = await updatePayoutStatus(
      id,
      status,
      status === "rejected" ? rejectionReason : undefined,
    );
    setIsUpdating(null);

    if (res.success) {
      toast.success(res.message);
      setList((prev) => prev.map((p) => (p._id === id ? { ...p, status } : p)));
      setRejectionReason("");
    } else {
      toast.error(res.message);
    }
  }

  const methodIcons: Record<string, any> = {
    "M-Pesa": Wallet,
    PayPal: DollarSign,
    "Bank Transfer": Building2,
  };

  return (
    <div className="space-y-6">
      {/* Stats summary row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Total Requests:
            </span>
            <span className="font-bold text-lg">{totalPayouts}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <CardTitle>Payout Requests</CardTitle>
            <span className="text-sm text-muted-foreground">
              {list.length === 0
                ? "No requests found"
                : `Showing ${list.length} of ${totalPayouts} request${totalPayouts !== 1 ? "s" : ""}`}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payout requests found.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-32.5">Requested</TableHead>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="w-27.5">Method</TableHead>
                    <TableHead className="w-45">Payment Details</TableHead>
                    <TableHead className="w-22.5 text-right">Amount</TableHead>
                    <TableHead className="w-27.5">Status</TableHead>
                    <TableHead className="w-50 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((payout: any) => {
                    const Icon = methodIcons[payout.paymentMethod] || Wallet;
                    return (
                      <TableRow
                        key={payout._id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>
                              {new Intl.DateTimeFormat("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }).format(new Date(payout.createdAt))}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {
                                formatDateTime(new Date(payout.createdAt))
                                  .timeOnly
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {payout.affiliate?.user?.name ||
                                "Unknown Affiliate"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-37.5">
                              {payout.affiliate?.user?.email || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-muted p-1.5">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium">
                              {payout.paymentMethod}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">
                                {payout.paymentDetails?.recipient || "N/A"}
                              </span>
                            </div>
                            {payout.adminNote &&
                              payout.status === "rejected" && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
                                  <p className="font-medium">
                                    Rejection reason: {payout.adminNote}
                                  </p>
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-lg">
                            {formatCurrency(payout.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payout.status === "paid"
                                ? "success"
                                : payout.status === "pending"
                                  ? "pending"
                                  : payout.status === "processing"
                                    ? "default"
                                    : "destructive"
                            }
                            className="flex items-center gap-1.5 h-fit py-1"
                          >
                            {payout.status === "paid" && (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {payout.status === "pending" && (
                              <Clock className="h-3 w-3" />
                            )}
                            {payout.status === "processing" && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            {payout.status === "rejected" && (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {payout.status.charAt(0).toUpperCase() +
                              payout.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {payout.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                disabled={isUpdating === payout._id}
                                onClick={() =>
                                  handleStatusUpdate(payout._id, "paid")
                                }
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                {isUpdating === payout._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                    Mark Paid
                                  </>
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
                                    disabled={isUpdating === payout._id}
                                  >
                                    <AlertCircle className="mr-1 h-3.5 w-3.5" />
                                    Reject
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Reject Payout Request
                                    </DialogTitle>
                                    <DialogDescription>
                                      Provide a reason for rejecting this payout
                                      request. The affiliate will be notified.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <Textarea
                                      placeholder="Enter rejection reason..."
                                      value={rejectionReason}
                                      onChange={(e) =>
                                        setRejectionReason(e.target.value)
                                      }
                                      className="min-h-25"
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="destructive"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          payout._id,
                                          "rejected",
                                        )
                                      }
                                      disabled={
                                        !rejectionReason.trim() ||
                                        isUpdating === payout._id
                                      }
                                    >
                                      {isUpdating === payout._id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "Confirm Rejection"
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          {payout.status === "processing" && (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={isUpdating === payout._id}
                              onClick={() =>
                                handleStatusUpdate(payout._id, "paid")
                              }
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {isUpdating === payout._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  Confirm Payment
                                </>
                              )}
                            </Button>
                          )}
                          <DeleteDialog
                            id={payout._id}
                            action={deletePayoutRequest}
                            callbackAction={() =>
                              setList((prev) =>
                                prev.filter((p) => p._id !== payout._id),
                              )
                            }
                            title="Delete Payout Request?"
                            description="This will delete the payout request and refund the amount to the affiliate's balance. This action cannot be undone."
                          />
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

      {totalPages > 1 && (
        <Pagination page={currentPage.toString()} totalPages={totalPages} />
      )}
    </div>
  );
}
