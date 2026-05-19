"use client";

import { ArrowRight, LifeBuoy, Mail, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import SupportTicketForm from "./support-ticket-form";

export default function SupportTicketModal({
  initialName,
  initialEmail,
}: {
  initialName?: string;
  initialEmail?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-linear-to-br from-muted/60 via-background to-background shadow-sm">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LifeBuoy className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">Need a hand?</p>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Create a support ticket in minutes
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Tell us what happened and our team will follow up by email. You
              can track every response from this page.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 ring-1 ring-border">
                <Mail className="size-3.5" aria-hidden="true" /> Email updates
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 ring-1 ring-border">
                <LifeBuoy className="size-3.5" aria-hidden="true" /> Order,
                payment & account help
              </span>
            </div>
          </div>
        </div>

        <ResponsiveModal
          title="New support ticket"
          description="Share the details below and we will get back to you as soon as possible."
          trigger={() => (
            <Button size="lg" className="w-full rounded-xl sm:w-auto">
              <MessageSquarePlus className="size-4" aria-hidden="true" />
              New Support Ticket
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
          dialogContentClassName="sm:max-w-2xl"
          drawerContentClassName="max-h-[92vh]"
        >
          {({ close }) => (
            <SupportTicketForm
              initialName={initialName}
              initialEmail={initialEmail}
              onSuccess={close}
              presentation="plain"
            />
          )}
        </ResponsiveModal>
      </div>
    </section>
  );
}
