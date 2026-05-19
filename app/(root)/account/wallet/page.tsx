import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { toSignInPath } from "@/lib/redirects";

import { connectToDatabase } from "@/lib/db";
import User from "@/lib/db/models/user.model";
import WalletTransaction, {
  IWalletTransaction,
} from "@/lib/db/models/wallet-transaction.model";

import { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";

import {
  formatDateTime,
  formatNumber,
  formatNumberWithTwoDecimals,
  cn,
} from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Pagination from "@/components/shared/pagination";
import Breadcrumb from "@/components/shared/breadcrumb";

import {
  Wallet as WalletIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRight,
  History,
  ShoppingBag,
} from "lucide-react";

import { getSetting } from "@/lib/actions/setting.actions";
import { WalletPayoutDialog } from "./wallet-payout-dialog";
import { WalletTopupDialog } from "./wallet-topup-dialog";
import mongoose from "mongoose";

export const metadata: Metadata = {
  title: "My Wallet",
};

type WalletHistoryEvent = {
  id: string;
  date: string;
  type: "earned" | "redeemed";
  amount: number;
  orderId?: string;
  description: string;
  sourceLabel: string;
};

const WALLET_SOURCE_LABELS: Record<IWalletTransaction["source"], string> = {
  admin_adjustment: "Admin Adjustment",
  refund: "Refund",
  wallet_payment: "Wallet Payment",
  deposit: "Top-up",
  payout: "Payout",
  affiliate_transfer: "Affiliate Transfer",
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  await connectToDatabase();

  const session = await getServerSession();
  if (!session?.user) redirect(toSignInPath());

  const {
    common: { pageSize },
  } = await getSetting();

  const user = await User.findById(session.user.id)
    .select("walletBalance")
    .lean();
  const skipAmount = (pageNum - 1) * pageSize;

  const [totalCount, transactions, summaryAggregation] = await Promise.all([
    WalletTransaction.countDocuments({
      user: session.user.id,
    }),
    WalletTransaction.find({
      user: session.user.id,
    })
      .populate({
        path: "order",
        select: "_id",
      })
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(pageSize)
      .lean(),
    WalletTransaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(session.user.id),
        },
      },
      {
        $group: {
          _id: null,
          totalCredited: {
            $sum: {
              $cond: [{ $gte: ["$amount", 0] }, "$amount", 0],
            },
          },
          totalDebited: {
            $sum: {
              $cond: [
                { $lt: ["$amount", 0] },
                { $multiply: ["$amount", -1] },
                0,
              ],
            },
          },
          creditEvents: {
            $sum: {
              $cond: [{ $gte: ["$amount", 0] }, 1, 0],
            },
          },
          debitEvents: {
            $sum: {
              $cond: [{ $lt: ["$amount", 0] }, 1, 0],
            },
          },
          lastActivityAt: { $max: "$createdAt" },
        },
      },
    ]),
  ]);

  const typedTransactions = transactions as unknown as (IWalletTransaction & {
    order?: { _id: string };
  })[];

  const summary = summaryAggregation[0];
  const currentBalance = user?.walletBalance || 0;
  const totalCredited = summary?.totalCredited || 0;
  const totalDebited = summary?.totalDebited || 0;
  const creditEvents = summary?.creditEvents || 0;
  const debitEvents = summary?.debitEvents || 0;
  const walletUsageRate =
    totalCredited > 0
      ? Math.min(100, Math.round((totalDebited / totalCredited) * 100))
      : 0;
  const lastActivity = summary?.lastActivityAt
    ? formatDateTime(new Date(summary.lastActivityAt)).dateOnly
    : "No activity yet";

  const history: WalletHistoryEvent[] = typedTransactions.map((tx) => {
    const isCredit = tx.amount >= 0;
    const sourceLabel =
      WALLET_SOURCE_LABELS[tx.source] ||
      tx.source
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

    return {
      id: tx._id.toString(),
      date: tx.createdAt?.toISOString() || new Date().toISOString(),
      type: isCredit ? "earned" : "redeemed",
      amount: Math.abs(tx.amount || 0),
      orderId: tx.order?._id?.toString(),
      description: tx.reason || sourceLabel,
      sourceLabel,
    };
  });

  return (
    <div className="space-y-8">
      <Script
        id="paystack-script"
        src="https://js.paystack.co/v1/inline.js"
        strategy="lazyOnload"
      />

      <Breadcrumb />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <WalletIcon className="h-7 w-7 text-primary" />
            My Wallet
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage balance, top-ups, payouts, and wallet spending
          </p>
        </div>

        <div className="flex items-center justify-start gap-3">
          <WalletTopupDialog />

          <WalletPayoutDialog currentBalance={currentBalance} />
        </div>
      </div>

      <Card className="border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <WalletIcon className="h-3.5 w-3.5 text-primary" />
                Current Balance
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                KES {formatNumberWithTwoDecimals(currentBalance)}
              </h2>
              <p className="text-sm text-muted-foreground">
                Ready to use for checkout and eligible payouts
              </p>
              <p className="text-xs text-muted-foreground">
                Last wallet activity: {lastActivity}
              </p>
            </div>

            <div className="rounded-xl border bg-background/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Spend ratio</span>
                <span className="font-semibold">{walletUsageRate}%</span>
              </div>
              <Progress
                value={walletUsageRate}
                aria-label="Wallet spend ratio"
              />
              <p className="text-xs text-muted-foreground">
                You spent KES {formatNumberWithTwoDecimals(totalDebited)} out of
                KES {formatNumberWithTwoDecimals(totalCredited)} credited to
                your wallet.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="gap-2 py-4 shadow-none">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">Total credited</p>
                <p className="text-lg font-semibold text-green-600">
                  +KES {formatNumberWithTwoDecimals(totalCredited)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatNumber(creditEvents)} credit events
                </p>
              </CardContent>
            </Card>
            <Card className="gap-2 py-4 shadow-none">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">Total spent</p>
                <p className="text-lg font-semibold text-red-600">
                  -KES {formatNumberWithTwoDecimals(totalDebited)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatNumber(debitEvents)} debit events
                </p>
              </CardContent>
            </Card>
            <Card className="gap-2 py-4 shadow-none">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-lg font-semibold">
                  {formatNumber(totalCount)} events
                </p>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 mt-1"
                >
                  <Link href="/search" prefetch>
                    Shop with wallet
                    <ShoppingBag className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div id="wallet-history" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Transaction History
          </h2>
          <span className="text-xs text-muted-foreground">
            Page {pageNum} of {Math.max(1, Math.ceil(totalCount / pageSize))}
          </span>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-muted-foreground">
                No wallet transactions yet. Top up your wallet to start using it
                at checkout.
              </p>
              <Button asChild variant="outline">
                <Link href="/search" prefetch>
                  Browse Menu Items
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3 md:hidden">
              {history.map((tx) => (
                <Card key={tx.id} className="gap-3 py-4">
                  <CardContent className="px-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge
                        variant={
                          tx.type === "earned" ? "success" : "destructive"
                        }
                        className="flex items-center gap-1 w-fit"
                      >
                        {tx.type === "earned" ? (
                          <ArrowUpCircle className="h-4 w-4" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4" />
                        )}
                        {tx.type}
                      </Badge>
                      <p
                        className={cn(
                          "font-bold text-base",
                          tx.type === "earned"
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {tx.type === "earned" ? "+" : "-"}KES{" "}
                        {formatNumberWithTwoDecimals(tx.amount)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{tx.description}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {tx.sourceLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(new Date(tx.date)).dateTime}
                      </p>
                    </div>

                    {tx.orderId ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="px-0"
                      >
                        <Link
                          href={`/account/orders/${tx.orderId}#wallet-history`}
                        >
                          View Order
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No order link
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-t hover:bg-muted/40 transition"
                    >
                      <td className="p-3">
                        <Badge
                          variant={
                            tx.type === "earned" ? "success" : "destructive"
                          }
                          className="flex items-center gap-1 w-fit"
                        >
                          {tx.type === "earned" ? (
                            <ArrowUpCircle className="h-4 w-4" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4" />
                          )}
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{tx.description}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {tx.sourceLabel}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDateTime(new Date(tx.date)).dateTime}
                      </td>
                      <td
                        className={cn(
                          "p-3 text-right font-bold",
                          tx.type === "earned"
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {tx.type === "earned" ? "+" : "-"}KES{" "}
                        {formatNumberWithTwoDecimals(tx.amount)}
                      </td>
                      <td className="p-3 text-right">
                        {tx.orderId ? (
                          <Button
                            asChild
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                          >
                            <Link
                              href={`/account/orders/${tx.orderId}#wallet-history`}
                            >
                              View Order
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalCount > pageSize && (
          <div className="flex justify-center pt-4">
            <Pagination
              page={pageNum}
              totalPages={Math.ceil(totalCount / pageSize)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
