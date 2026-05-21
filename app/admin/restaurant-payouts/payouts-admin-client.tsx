"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { processRestaurantPayoutByAdmin } from "@/lib/actions/restaurant-finance.actions";
import Price from "@/components/shared/menuItem/price";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/shared/pagination";

type AdminPayoutData = {
  payouts: Array<{
    _id: string;
    amount: number;
    status: string;
    payoutMethod: string;
    payoutMethodLabel?: string;
    destinationMasked: string;
    accountReference?: string;
    createdAt: string;
    paystackRecipientCode?: string;
    paystackTransferCode?: string;
    paystackReference?: string;
    restaurant?: { name?: string; slug?: string };
    requestedBy?: { name?: string; email?: string };
  }>;
  totalPayouts: number;
  totalPages: number;
  balances: {
    totalPending: number;
    totalAvailable: number;
    totalReserved: number;
    totalPaid: number;
    totalCommission: number;
    totalNet: number;
  };
};

export default function PayoutsAdminClient({
  initialData,
  currentPage,
  currentStatus,
}: {
  initialData: AdminPayoutData;
  currentPage: number;
  currentStatus: string;
}) {
  const [statusFilter, setStatusFilter] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const formatPayoutMethod = (methodLabel?: string, method?: string) =>
    methodLabel || method || "Payout";

  const handleDecision = (
    payout: AdminPayoutData["payouts"][number],
    decision: "pay" | "reject",
  ) => {
    const requiresManualReference =
      decision === "pay" && !payout.paystackRecipientCode;
    let paymentReference: string | undefined;
    if (requiresManualReference) {
      const input = window.prompt(
        "Enter payment reference for manual payout (bank transfer ref / M-Pesa confirmation code):",
      );
      if (input === null) return;
      paymentReference = input.trim();
      if (!paymentReference) {
        toast.error("Payment reference is required for manual payout");
        return;
      }
    }

    startTransition(async () => {
      const result = await processRestaurantPayoutByAdmin({
        payoutId: payout._id,
        decision,
        paymentReference,
      });
      if (!result.success) {
        toast.error(result.message || "Action failed");
        return;
      }

      toast.success(result.message || "Payout updated");
      window.location.reload();
    });
  };

  const onFilterChange = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(window.location.search);
    params.set("status", value);
    params.set("page", "1");
    window.location.search = params.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="h1-bold">Restaurant Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Process restaurant disbursements and monitor settlement balances.
          </p>
        </div>

        <div className="w-48">
          <Select value={statusFilter} onValueChange={onFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Price price={Number(initialData.balances.totalPending || 0)} plain />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Price price={Number(initialData.balances.totalAvailable || 0)} plain />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Price price={Number(initialData.balances.totalPaid || 0)} plain />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.payouts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No payouts found.
                  </TableCell>
                </TableRow>
              )}

              {initialData.payouts.map((payout) => (
                <TableRow key={payout._id}>
                  <TableCell>{new Date(payout.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{payout.restaurant?.name || "Unknown"}</TableCell>
                  <TableCell>
                    {payout.requestedBy?.name || payout.requestedBy?.email || "-"}
                  </TableCell>
                  <TableCell>
                    <Price price={payout.amount} plain />
                  </TableCell>
                  <TableCell className="uppercase text-xs">{payout.status}</TableCell>
                  <TableCell>
                    {formatPayoutMethod(payout.payoutMethodLabel, payout.payoutMethod)}
                  </TableCell>
                  <TableCell>{payout.destinationMasked}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(payout.status === "pending" || payout.status === "processing") && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleDecision(payout, "pay")}
                            disabled={isPending}
                          >
                            Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDecision(payout, "reject")}
                            disabled={isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {initialData.totalPages > 1 && (
            <div className="mt-4">
              <Pagination page={String(currentPage)} totalPages={initialData.totalPages} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
