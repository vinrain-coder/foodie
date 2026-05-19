import {
  CheckCircle2,
  Clock3,
  Inbox,
  MessageCircle,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { toSignInPath } from "@/lib/redirects";

import { getMySupportTickets } from "@/lib/actions/support.actions";
import Breadcrumb from "@/components/shared/breadcrumb";
import SupportTicketModal from "@/components/shared/support/support-ticket-modal";

const supportTypeLabels = {
  query: "Query",
  complaint: "Complaint",
  recommendation: "Recommendation",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AccountSupportPage() {
  const session = await getServerSession();
  if (!session?.user) redirect(toSignInPath());

  const tickets = await getMySupportTickets();
  const openTickets = tickets.data.filter(
    (ticket) => ticket.status === "open",
  ).length;
  const repliedTickets = tickets.data.filter(
    (ticket) => ticket.status === "replied",
  ).length;

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Support center
            </Badge>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Customer Support
              </h1>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                Submit complaints, queries, or recommendations and track every
                reply from one clean workspace.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted/50 p-2 text-center sm:min-w-80">
            <div className="rounded-xl bg-background p-3 shadow-xs">
              <p className="text-xl font-semibold">{tickets.data.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-xl bg-background p-3 shadow-xs">
              <p className="text-xl font-semibold">{openTickets}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
            <div className="rounded-xl bg-background p-3 shadow-xs">
              <p className="text-xl font-semibold">{repliedTickets}</p>
              <p className="text-xs text-muted-foreground">Replied</p>
            </div>
          </div>
        </div>
      </section>

      <SupportTicketModal
        initialName={session.user.name || ""}
        initialEmail={session.user.email || ""}
      />

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Your requests
            </h2>
            <p className="text-sm text-muted-foreground">
              Follow the status and replies for your submitted tickets.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">
            {tickets.data.length}{" "}
            {tickets.data.length === 1 ? "ticket" : "tickets"}
          </Badge>
        </div>

        {tickets.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="size-7" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold">No support tickets yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              When you create a ticket, it will appear here with its status,
              submitted message, and any replies from our team.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 p-2 sm:p-6">
            {tickets.data.map((ticket) => {
              const isReplied = ticket.status === "replied";

              return (
                <article
                  key={ticket._id}
                  className="rounded-2xl border-l border-t bg-background p-4 shadow-xs transition-colors hover:bg-muted/20 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-full capitalize"
                        >
                          {supportTypeLabels[ticket.type]}
                        </Badge>
                        <Badge
                          variant={isReplied ? "success" : "pending"}
                          className="rounded-full capitalize"
                        >
                          {isReplied ? (
                            <CheckCircle2 aria-hidden="true" />
                          ) : (
                            <Clock3 aria-hidden="true" />
                          )}
                          {ticket.status}
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold leading-6">
                        {ticket.subject}
                      </h3>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TicketCheck className="size-3.5" aria-hidden="true" />
                        Submitted{" "}
                        {dateFormatter.format(new Date(ticket.createdAt))}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-line rounded-xl bg-muted/40 p-3 text-sm leading-6 text-foreground/90">
                    {ticket.message}
                  </p>

                  {ticket.adminReply ? (
                    <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm">
                      <div className="mb-2 flex items-center gap-2 font-medium text-primary">
                        <MessageCircle className="size-4" aria-hidden="true" />
                        Support reply
                      </div>
                      <p className="whitespace-pre-line leading-6 text-foreground/90">
                        {ticket.adminReply}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                      We&apos;re reviewing this request and will add a reply
                      here once an agent responds.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
