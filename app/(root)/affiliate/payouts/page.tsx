import type { Metadata } from "next";
import { getAffiliateDashboardData } from "@/lib/actions/affiliate.actions";
import { getSetting } from "@/lib/actions/setting.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Wallet,
  TrendingDown,
  DollarSign,
  Inbox,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/shared/pagination";
import Breadcrumb from "@/components/shared/breadcrumb";
import { redirect } from "next/navigation";
import PayoutRequestForm from "@/components/affiliate/payout-request-form";
import PayoutStatusTabs from "./payout-status-tabs";

export const metadata: Metadata = {
  title: "Affiliate Payouts",
  description:
    "Manage your affiliate withdrawals, track payout requests, view earnings balance, and monitor payment processing in real time.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AffiliatePayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page = "1", status = "all" } = await searchParams;
  const pageNum = Math.max(1, Math.floor(parseInt(page, 10) || 1));
  const result = await getAffiliateDashboardData({ payoutPage: pageNum });

  if (!result.success) {
    if (result.message === "User not authenticated") {
      const { toSignInPath } = await import("@/lib/redirects");
      redirect(toSignInPath());
    }

    return (
      <div className="container mx-auto py-10">
        <Breadcrumb />
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
          {result.message ||
            "An unexpected error occurred; please try again later"}
        </div>
      </div>
    );
  }

  const {
    affiliate,
    recentPayouts,
    payoutTotalPages = 1,
    payoutSummary,
  } = result.data || {};
  const { affiliate: settings } = await getSetting();

  // Filter payouts by status if needed (client-side filtering for simplicity)
  const displayedPayouts =
    status !== "all"
      ? recentPayouts.filter((p: any) => p.status === status)
      : recentPayouts;

  // Calculate filtered total pages (rough estimate)
  const filteredTotalPages =
    status === "all"
      ? payoutTotalPages
      : Math.max(1, Math.ceil(displayedPayouts.length / 10));

  const statCards = [
    {
      id: "paid",
      label: "Total Paid Out",
      value: payoutSummary?.paid?.amount || 0,
      count: payoutSummary?.paid?.count || 0,
      icon: CheckCircle2,
      color:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
      description: "Successfully completed payouts",
    },
    {
      id: "pending",
      label: "Pending Approval",
      value: payoutSummary?.pending?.amount || 0,
      count: payoutSummary?.pending?.count || 0,
      icon: Clock,
      color:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
      description: "Awaiting admin review",
    },
    {
      id: "processing",
      label: "Processing",
      value: payoutSummary?.processing?.amount || 0,
      count: payoutSummary?.processing?.count || 0,
      icon: Wallet,
      color: "bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400",
      description: "Currently being processed",
    },
    {
      id: "rejected",
      label: "Rejected",
      value: payoutSummary?.rejected?.amount || 0,
      count: payoutSummary?.rejected?.count || 0,
      icon: AlertCircle,
      color: "bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
      description: "Failed payout requests",
    },
  ];

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Breadcrumb />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payouts Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your withdrawal requests
          </p>
        </div>
      </div>

      {/* 💰 BALANCE & REQUEST FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="lg:col-span-1 rounded-xl border-2 border-primary/20 border-dashed transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground uppercase">
              Available Balance
            </CardTitle>
            <div className="rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 p-2">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(affiliate.earningsBalance)}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Earned</span>
                <span className="font-medium">
                  {formatCurrency(affiliate.totalEarnings)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min. Withdrawal</span>
                <span className="font-medium">
                  {formatCurrency(settings.minWithdrawalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Form - only for approved affiliates */}
        <div className="lg:col-span-2">
          {affiliate.status === "approved" ? (
            <PayoutRequestForm
              currentBalance={affiliate.earningsBalance}
              minAmount={settings.minWithdrawalAmount}
            />
          ) : affiliate.status === "pending" ? (
            <Card className="rounded-xl border-orange-200 bg-orange-50/40 dark:bg-orange-950/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-orange-700">
                      Application Under Review
                    </h3>
                    <p className="text-sm text-orange-600/80 mt-1">
                      Your affiliate application is being reviewed. Once
                      approved, you'll be able to request payouts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-red-200 bg-red-50/40 dark:bg-red-950/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-700">
                      Application Rejected
                    </h3>
                    <p className="text-sm text-red-600/80 mt-1">
                      {affiliate.adminNote ||
                        "Your affiliate application was not approved. Please contact support for more information."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 📊 SUMMARY STATS */}
      {payoutSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.id}
                className="rounded-xl border shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div
                      className={cn("rounded-lg p-2", stat.color.split(" ")[0])}
                    >
                      <Icon
                        className={cn("h-4 w-4", stat.color.split(" ")[1])}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                      {stat.count} {stat.count === 1 ? "request" : "requests"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold leading-tight">
                      {formatCurrency(stat.value)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 📋 PAYOUT HISTORY */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete record of your withdrawal requests and their status
          </p>
        </CardHeader>
        <CardContent>
          {/* Status Tabs */}
          <PayoutStatusTabs />

          {displayedPayouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No payout requests</h3>
              <p className="text-muted-foreground max-w-sm mt-1">
                {status === "all"
                  ? "You haven&apos;t made any payout requests yet. Once you start earning, request your earnings here."
                  : `No ${status} payout requests found.`}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-30">Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-25">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedPayouts.map((payout: any) => {
                      const methodIcons: Record<string, any> = {
                        "M-Pesa": Wallet,
                        PayPal: DollarSign,
                        "Bank Transfer": TrendingDown,
                      };
                      const Icon = methodIcons[payout.paymentMethod] || Wallet;

                      return (
                        <TableRow
                          key={payout._id}
                          className="group hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div>
                              <p>
                                {new Intl.DateTimeFormat("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }).format(new Date(payout.createdAt))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Intl.DateTimeFormat("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(payout.createdAt))}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-muted p-1.5">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <span className="font-medium">
                                {payout.paymentMethod}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">
                                {payout.paymentDetails?.recipient || "N/A"}
                              </p>
                              {payout.adminNote &&
                                payout.status === "rejected" && (
                                  <div className="mt-1.5 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
                                    <p className="font-medium">
                                      Reason: {payout.adminNote}
                                    </p>
                                  </div>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(payout.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px] flex items-center gap-1 px-2 py-0.5 h-fit font-medium",
                                payout.status === "paid" &&
                                  "bg-emerald-100 text-emerald-600 hover:bg-emerald-100",
                                payout.status === "pending" &&
                                  "bg-amber-100 text-amber-600 hover:bg-amber-100",
                                payout.status === "processing" &&
                                  "bg-sky-100 text-sky-600 hover:bg-sky-100",
                                payout.status === "rejected" &&
                                  "bg-rose-100 text-rose-600 hover:bg-rose-100",
                              )}
                            >
                              {payout.status === "paid" && (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {payout.status === "pending" && (
                                <Clock className="h-3 w-3" />
                              )}
                              {payout.status === "processing" && (
                                <Wallet className="h-3 w-3" />
                              )}
                              {payout.status === "rejected" && (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              {payout.status.charAt(0).toUpperCase() +
                                payout.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredTotalPages > 1 && (
                <div className="flex justify-center pt-6">
                  <Pagination page={pageNum} totalPages={filteredTotalPages} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 💡 TIPS CARD */}
      <Card className="rounded-xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/10 dark:border-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-1.5 mt-0.5">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-700 dark:text-blue-400">
                Payout Tips
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-blue-600/80 dark:text-blue-300/70">
                <li>
                  • Minimum withdrawal:{" "}
                  {formatCurrency(settings.minWithdrawalAmount)}
                </li>
                <li>
                  • Payouts are typically processed within 2-3 business days
                </li>
                <li>
                  • Ensure your payment details are accurate to avoid delays
                </li>
                <li>• You can track all your payouts in this history</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
