"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { LoadingButton } from "@/components/shared/loading-button";

export default function ReplyReviewDialog({
  initialReply,
}: {
  reviewId: string;
  initialReply?: { message?: string };
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(initialReply?.message || "");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <MessageSquare className="mr-2 size-4" />
          {initialReply ? "Edit Reply" : "Reply"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialReply ? "Edit Review Reply" : "Reply to Review"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your response to the customer..."
            className="min-h-25 resize-none"
          />

          <div className="flex justify-end">
            <LoadingButton
              type="submit"
              className="w-full"
              loading={isPending}
              disabled={isPending || !message.trim()}
            >
              {isPending ? "Sending..." : "Send Reply"}
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
