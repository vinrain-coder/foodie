import type { Metadata } from "next";
import { Clock, LifeBuoy, MailCheck, ShieldCheck } from "lucide-react";
import SupportTicketModal from "@/components/shared/support/support-ticket-modal";
import { Card, CardContent } from "@/components/ui/card";
import { getServerSession } from "@/lib/get-session";
import Breadcrumb from "@/components/shared/breadcrumb";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with your orders, payments, returns, and account questions.",
  alternates: { canonical: "/support" },
};

export default async function PublicSupportPage() {
  const session = await getServerSession();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 py-4">
      <Breadcrumb />

      <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-muted/70 via-background to-background shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <LifeBuoy className="size-3.5 text-primary" aria-hidden="true" />
              Customer care desk
            </div>
            <div className="max-w-2xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                How can we help today?
              </h1>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                Submit a compact support ticket for orders, payments, returns, product questions,
                or account issues. We&apos;ll review it and reply by email.
              </p>
            </div>
            <SupportTicketModal
              initialName={session?.user?.name || ""}
              initialEmail={session?.user?.email || ""}
            />
          </div>

          <Card className="border-dashed bg-background/80 py-0 shadow-none">
            <CardContent className="space-y-4 p-5">
              {[
                { icon: MailCheck, label: "Email replies", text: "Responses go to the email on your ticket." },
                { icon: Clock, label: "Helpful context", text: "Order details help us resolve requests faster." },
                { icon: ShieldCheck, label: "Secure handling", text: "Your request is handled by our support team." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-3 rounded-2xl p-2 transition-colors hover:bg-muted/60">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs leading-5 text-muted-foreground">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
