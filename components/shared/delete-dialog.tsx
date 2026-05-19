"use client"
import { useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

import type { ActionState } from "@/types/action-state";

export default function DeleteDialog({
  id,
  action,
  onDelete,
  callbackAction,
  triggerLabel = "Delete",
  title = "Delete this item?",
  description = "This action cannot be undone. This will permanently delete the item from the system.",
}: {
  id: string;
  action?: (id: string) => Promise<ActionState>;
  onDelete?: () => Promise<ActionState>;
  callbackAction?: () => void;
  triggerLabel?: string;
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          title={triggerLabel}
          className="group hover:border-red-200 hover:bg-red-50 dark:hover:border-red-900 dark:hover:bg-red-950/20 transition-all"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
          <span className="sr-only">{triggerLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
            className="sm:flex-1"
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            disabled={isPending}
            className="sm:flex-1 gap-2"
            onClick={() =>
              startTransition(async () => {
                const res = onDelete ? await onDelete() : await action?.(id);
                if (!res) {
                  toast.error("Delete action is not configured.");
                  return;
                }
                if (res.success) {
                  setOpen(false);
                  toast.success(res.message);
                  if (callbackAction) callbackAction();
                } else {
                  toast.error(res.message);
                }
              })
            }
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
