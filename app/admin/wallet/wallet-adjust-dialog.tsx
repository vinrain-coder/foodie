"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { adjustUserWalletAdmin } from "@/lib/actions/wallet.actions";
import { Wallet } from "lucide-react";
import { formatNumberWithTwoDecimals } from "@/lib/utils";
import { z } from "zod";
import { AdminWalletAdjustmentInputSchema } from "@/lib/validator";

const WalletAdjustFormSchema = z.object({
  type: z.enum(["add", "deduct"]),
  amount: z.coerce.number().positive("Please enter a valid positive amount"),
  reason: AdminWalletAdjustmentInputSchema.shape.reason,
});

export default function WalletAdjustDialog({
  userId,
  currentBalance,
}: {
  userId: string;
  currentBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validated = WalletAdjustFormSchema.safeParse({
      type,
      amount,
      reason,
    });
    if (!validated.success) {
      return toast.error(
        validated.error.issues[0]?.message || "Please correct the form fields",
      );
    }
    const validatedType = validated.data.type;
    const validatedAmount = validated.data.amount;
    const validatedReason = validated.data.reason;

    if (validatedType !== "add" && validatedAmount > currentBalance) {
      return toast.error("Cannot deduct more than current balance");
    }

    setLoading(true);
    try {
      const finalAmount =
        validatedType === "add" ? validatedAmount : -validatedAmount;
      const res = await adjustUserWalletAdmin({
        userId,
        amount: finalAmount,
        reason: validatedReason,
      });

      if (res.success) {
        toast.success(res.message);
        setOpen(false);
        setAmount("");
        setReason("");
      } else {
        toast.error(res.message || "Failed to adjust balance");
      }
    } catch {
      toast.error("An error occurred during balance adjustment");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setAmount("");
      setReason("");
      setType("add");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wallet className="size-4" />
          Adjust Balance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adjust Wallet Balance</DialogTitle>
            <DialogDescription>
              Manually add or deduct balance from the user&apos;s wallet. Current balance: {formatNumberWithTwoDecimals(currentBalance)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Adjustment Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "add" | "deduct")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Balance (+)</SelectItem>
                  <SelectItem value="deduct">Deduct Balance (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter adjustment reason..."
                className="resize-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Confirm Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
