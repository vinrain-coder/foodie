"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveRiderByAdmin,
  deleteRiderByAdmin,
  reactivateRiderByAdmin,
  suspendRiderByAdmin,
} from "@/lib/actions/rider-profile.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function RiderReviewActions({
  riderUserId,
  riderStatus,
  isKycVerified,
  activeJobCount,
}: {
  riderUserId: string;
  riderStatus: "pending_kyc" | "active" | "suspended";
  isKycVerified: boolean;
  activeJobCount: number;
}) {
  const router = useRouter();
  const [kycReason, setKycReason] = useState("");
  const [adminReason, setAdminReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "approve" | "reject" | "suspend" | "reactivate" | "delete" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const pendingLabel = useMemo(() => {
    if (!isPending || !pendingAction) return "";
    if (pendingAction === "approve") return "Approving rider account...";
    if (pendingAction === "reject") return "Rejecting rider application...";
    if (pendingAction === "suspend") return "Suspending rider account...";
    if (pendingAction === "reactivate") return "Reactivating rider account...";
    return "Deleting rider profile...";
  }, [isPending, pendingAction]);

  const runAction = (
    action: "approve" | "reject" | "suspend" | "reactivate" | "delete",
    callback: () => Promise<{ success: boolean; message?: string }>,
    successMessage: string,
  ) => {
    setPendingAction(action);
    startTransition(async () => {
      try {
        const response = await callback();
        if (!response.success) {
          toast.error(response.message || "Failed to process rider action.");
          return;
        }

        toast.success(response.message || successMessage);
        if (action === "delete") {
          router.push("/admin/riders");
          return;
        }
        router.refresh();
      } catch {
        toast.error("Unexpected error while processing rider action.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleReview = (approved: boolean) => {
    const trimmedReason = kycReason.trim();
    if (!approved && !trimmedReason) {
      toast.error("Rejection reason is required.");
      return;
    }

    runAction(
      approved ? "approve" : "reject",
      async () =>
        approveRiderByAdmin({
          riderUserId,
          approved,
          rejectionReason: trimmedReason,
        }),
      approved ? "Rider approved and activated." : "Rider registration rejected.",
    );
  };

  const handleSuspend = () => {
    const trimmedReason = adminReason.trim();
    if (trimmedReason.length < 5) {
      toast.error("Suspension reason must be at least 5 characters.");
      return;
    }
    runAction(
      "suspend",
      async () =>
        suspendRiderByAdmin({
          riderUserId,
          reason: trimmedReason,
        }),
      "Rider suspended successfully.",
    );
  };

  const handleReactivate = () => {
    runAction(
      "reactivate",
      async () =>
        reactivateRiderByAdmin({
          riderUserId,
          reason: adminReason.trim() || undefined,
        }),
      "Rider reactivated successfully.",
    );
  };

  const handleDelete = () => {
    const trimmedReason = deleteReason.trim();
    if (trimmedReason.length < 5) {
      toast.error("Deletion reason must be at least 5 characters.");
      return;
    }
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      toast.error('Type "DELETE" to confirm rider deletion.');
      return;
    }
    runAction(
      "delete",
      async () =>
        deleteRiderByAdmin({
          riderUserId,
          reason: trimmedReason,
          confirmation: deleteConfirmation.trim(),
        }),
      "Rider profile deleted successfully.",
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">KYC Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            name="kycReason"
            value={kycReason}
            onChange={(event) => setKycReason(event.target.value)}
            placeholder="Required if rejecting - explain what needs to be corrected"
            rows={3}
            disabled={isPending}
          />

          {isPending ? (
            <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {pendingLabel}
              </span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => handleReview(true)}
              disabled={isPending || riderStatus === "suspended"}
              className="inline-flex gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isPending && pendingAction === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isPending && pendingAction === "approve"
                ? "Approving..."
                : "Approve & Activate"}
            </Button>
            <Button
              type="button"
              onClick={() => handleReview(false)}
              disabled={isPending}
              variant="destructive"
              className="inline-flex gap-2"
            >
              {isPending && pendingAction === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {isPending && pendingAction === "reject"
                ? "Rejecting..."
                : "Reject"}
            </Button>
          </div>

          {riderStatus === "suspended" ? (
            <p className="text-xs text-muted-foreground">
              This rider is currently suspended. Reactivate before approval.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            name="adminReason"
            value={adminReason}
            onChange={(event) => setAdminReason(event.target.value)}
            placeholder="Required for suspension (minimum 5 chars). Optional note for reactivation."
            rows={3}
            disabled={isPending}
          />

          {activeJobCount > 0 ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              Rider has {activeJobCount} active delivery job(s). Suspension is
              blocked until jobs are resolved or reassigned.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {riderStatus !== "suspended" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    className="inline-flex gap-2"
                  >
                    <PauseCircle className="h-4 w-4" />
                    Suspend Rider
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspend this rider?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will set rider status to suspended and force
                      availability offline.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSuspend}
                      disabled={isPending || activeJobCount > 0}
                    >
                      {isPending && pendingAction === "suspend"
                        ? "Suspending..."
                        : "Confirm Suspend"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    className="inline-flex gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Reactivate Rider
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reactivate this rider?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This restores rider access. If KYC is complete, status
                      returns to active, otherwise pending KYC.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReactivate}
                      disabled={isPending}
                    >
                      {isPending && pendingAction === "reactivate"
                        ? "Reactivating..."
                        : "Confirm Reactivate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/35">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Delete Rider Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Production safeguard: deletion is blocked when historical delivery,
            proof, payout, ledger, or audit records exist. Use suspension for
            riders with history.
          </p>
          <Textarea
            name="deleteReason"
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            placeholder="Deletion reason (minimum 5 chars)"
            rows={3}
            disabled={isPending}
          />
          <Input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder='Type "DELETE" to confirm'
            disabled={isPending}
          />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                className="inline-flex gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Rider
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete rider profile permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is irreversible. Ensure you entered a valid reason
                  and confirmation text before continuing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                  {isPending && pendingAction === "delete"
                    ? "Deleting..."
                    : "Confirm Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isKycVerified ? (
            <p className="text-xs text-muted-foreground">
              This rider is currently KYC-verified.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
