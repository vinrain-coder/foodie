"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  requestRestaurantPayout,
  upsertRestaurantPayoutAccount,
} from "@/lib/actions/restaurant-finance.actions";
import { formatNumberWithTwoDecimals } from "@/lib/utils";
import Price from "@/components/shared/menuItem/price";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type FinanceData = {
  restaurant: { _id: string; name: string; email?: string } | null;
  balance: {
    pendingBalance: number;
    availableBalance: number;
    reservedBalance: number;
    lifetimeNet: number;
    lifetimeCommission: number;
    lifetimePaid: number;
  };
  payoutAccount:
    | {
        payoutMethod:
          | "bank_transfer"
          | "mpesa_number"
          | "mpesa_till"
          | "mpesa_paybill";
        payoutMethodLabel?: string;
        accountName?: string;
        bankName?: string;
        accountNumber?: string;
        bankCode?: string;
        mobileMoneyNumber?: string;
        mpesaTillNumber?: string;
        mpesaPaybillNumber?: string;
        paybillAccountNumber?: string;
        paystackRecipientCode?: string;
      }
    | null;
  payouts: Array<{
    _id: string;
    amount: number;
    status: string;
    payoutMethod: string;
    payoutMethodLabel?: string;
    destinationMasked: string;
    createdAt: string;
    paidAt?: string;
  }>;
  recentLedger: Array<{
    _id: string;
    type: string;
    amount: number;
    settlementState?: string;
    createdAt: string;
  }>;
  policy: {
    currency: string;
    holdPeriodHours: number;
    minPayoutAmount: number;
  };
  viewerRole?: "ADMIN" | "RESTAURANT";
};

export default function FinanceClient({
  initialData,
  readOnly = false,
}: {
  initialData: FinanceData;
  readOnly?: boolean;
}) {
  const payoutMethodDisplay: Record<
    "bank_transfer" | "mpesa_number" | "mpesa_till" | "mpesa_paybill",
    string
  > = {
    bank_transfer: "Bank Transfer",
    mpesa_number: "M-Pesa Number",
    mpesa_till: "M-Pesa Till",
    mpesa_paybill: "M-Pesa Paybill",
  };
  const formatPayoutMethod = (method?: string) => {
    if (!method) return payoutMethodDisplay.bank_transfer;
    if (method in payoutMethodDisplay) {
      return payoutMethodDisplay[method as keyof typeof payoutMethodDisplay];
    }
    return method;
  };

  const [isPending, startTransition] = useTransition();
  const [payoutMethod, setPayoutMethod] = useState<
    "bank_transfer" | "mpesa_number" | "mpesa_till" | "mpesa_paybill"
  >(initialData.payoutAccount?.payoutMethod || "bank_transfer");
  const [bankName, setBankName] = useState(
    initialData.payoutAccount?.bankName || "",
  );
  const [accountName, setAccountName] = useState(
    initialData.payoutAccount?.accountName || initialData.restaurant?.name || "",
  );
  const [accountNumber, setAccountNumber] = useState(
    initialData.payoutAccount?.accountNumber || "",
  );
  const [bankCode, setBankCode] = useState(initialData.payoutAccount?.bankCode || "");
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState(
    initialData.payoutAccount?.mobileMoneyNumber || "",
  );
  const [mpesaTillNumber, setMpesaTillNumber] = useState(
    initialData.payoutAccount?.mpesaTillNumber || "",
  );
  const [mpesaPaybillNumber, setMpesaPaybillNumber] = useState(
    initialData.payoutAccount?.mpesaPaybillNumber || "",
  );
  const [paybillAccountNumber, setPaybillAccountNumber] = useState(
    initialData.payoutAccount?.paybillAccountNumber || "",
  );
  const [recipientCode, setRecipientCode] = useState(
    initialData.payoutAccount?.paystackRecipientCode || "",
  );
  const [payoutAmount, setPayoutAmount] = useState("");

  const available = Number(initialData.balance?.availableBalance || 0);

  const canRequest = useMemo(() => {
    const amount = Number(payoutAmount || 0);
    return (
      amount >= Number(initialData.policy.minPayoutAmount || 0) && amount <= available
    );
  }, [available, initialData.policy.minPayoutAmount, payoutAmount]);

  const savePayoutAccount = () => {
    if (readOnly) return;
    startTransition(async () => {
      const result = await upsertRestaurantPayoutAccount({
        payoutMethod,
        accountName,
        bankName,
        accountNumber,
        bankCode,
        mobileMoneyNumber,
        mpesaTillNumber,
        mpesaPaybillNumber,
        paybillAccountNumber,
        paystackRecipientCode: recipientCode,
      });

      if (!result.success) {
        toast.error(result.message || "Failed to save payout account");
        return;
      }

      toast.success(result.message || "Payout account saved");
      window.location.reload();
    });
  };

  const submitPayoutRequest = () => {
    if (readOnly) return;
    startTransition(async () => {
      const result = await requestRestaurantPayout({ amount: Number(payoutAmount) });
      if (!result.success) {
        toast.error(result.message || "Failed to request payout");
        return;
      }

      toast.success(result.message || "Payout request submitted");
      setPayoutAmount("");
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1-bold">Finance</h1>
        <p className="text-sm text-muted-foreground">
          Track settlement balances, payout requests, and account setup.
        </p>
        {readOnly ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Admin view is read-only on this page.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Price price={available} plain />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Price price={Number(initialData.balance?.pendingBalance || 0)} plain />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hold window: {initialData.policy.holdPeriodHours}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lifetime Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Price price={Number(initialData.balance?.lifetimePaid || 0)} plain />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={payoutMethod}
                onValueChange={(value) =>
                  setPayoutMethod(
                    value as
                      | "bank_transfer"
                      | "mpesa_number"
                      | "mpesa_till"
                      | "mpesa_paybill",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payout method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa_number">M-Pesa Number</SelectItem>
                  <SelectItem value="mpesa_till">M-Pesa Till</SelectItem>
                  <SelectItem value="mpesa_paybill">M-Pesa Paybill</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payoutMethod === "bank_transfer" ? (
              <>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Code</Label>
                  <Input value={bankCode} onChange={(e) => setBankCode(e.target.value)} />
                </div>
              </>
            ) : null}
            {payoutMethod === "mpesa_number" ? (
              <div className="space-y-2">
                <Label>M-Pesa Number</Label>
                <Input
                  placeholder="e.g. 07XXXXXXXX"
                  value={mobileMoneyNumber}
                  onChange={(e) => setMobileMoneyNumber(e.target.value)}
                />
              </div>
            ) : null}
            {payoutMethod === "mpesa_till" ? (
              <div className="space-y-2">
                <Label>M-Pesa Till Number</Label>
                <Input
                  value={mpesaTillNumber}
                  onChange={(e) => setMpesaTillNumber(e.target.value)}
                />
              </div>
            ) : null}
            {payoutMethod === "mpesa_paybill" ? (
              <>
                <div className="space-y-2">
                  <Label>M-Pesa Paybill Number</Label>
                  <Input
                    value={mpesaPaybillNumber}
                    onChange={(e) => setMpesaPaybillNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paybill Account Number</Label>
                  <Input
                    value={paybillAccountNumber}
                    onChange={(e) => setPaybillAccountNumber(e.target.value)}
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label>Paystack Recipient Code</Label>
              <Input value={recipientCode} onChange={(e) => setRecipientCode(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {payoutMethod === "bank_transfer"
              ? "Tip: leave recipient code blank to let the system create one where supported."
              : `Tip: recipient name defaults to "${initialData.restaurant?.name || "your restaurant"}".`}
          </p>

          <Button onClick={savePayoutAccount} disabled={isPending || readOnly}>
            {isPending ? "Saving..." : "Save payout account"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label>Amount</Label>
              <Input
                type="number"
                min={initialData.policy.minPayoutAmount}
                step="0.01"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Min payout: {formatNumberWithTwoDecimals(initialData.policy.minPayoutAmount)} {" "}
                {initialData.policy.currency}
              </p>
            </div>
          </div>

          <Button
            onClick={submitPayoutRequest}
            disabled={isPending || !canRequest || readOnly}
          >
            {isPending ? "Submitting..." : "Submit payout request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Destination</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.payouts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No payout requests yet.
                  </TableCell>
                </TableRow>
              )}
              {initialData.payouts.map((payout) => (
                <TableRow key={payout._id}>
                  <TableCell>{new Date(payout.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Price price={payout.amount} plain />
                  </TableCell>
                  <TableCell className="uppercase text-xs">{payout.status}</TableCell>
                  <TableCell>
                    {payout.payoutMethodLabel || formatPayoutMethod(payout.payoutMethod)}
                  </TableCell>
                  <TableCell>{payout.destinationMasked}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.recentLedger.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No ledger entries yet.
                  </TableCell>
                </TableRow>
              )}
              {initialData.recentLedger.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-xs uppercase">{entry.type}</TableCell>
                  <TableCell>
                    <Price price={entry.amount} plain />
                  </TableCell>
                  <TableCell className="text-xs uppercase">
                    {entry.settlementState || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
