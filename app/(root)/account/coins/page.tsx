import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { toSignInPath } from "@/lib/redirects";

import { connectToDatabase } from "@/lib/db";
import User from "@/lib/db/models/user.model";
import Order from "@/lib/db/models/order.model";

import { Metadata } from "next";
import Link from "next/link";

import {
  formatDateTime,
  formatId,
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
  Coins as CoinsIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRight,
  History,
  ShoppingBag,
} from "lucide-react";

import { getSetting } from "@/lib/actions/setting.actions";
import mongoose from "mongoose";

export const metadata: Metadata = {
  title: "My Coins",
};

type CoinHistoryEvent = {
  id: string;
  type: "earned" | "redeemed";
  amount: number;
  date: Date;
  orderId: string;
  description: string;
};

export default async function CoinsPage({
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
    site,
  } = await getSetting();

  const user = await User.findById(session.user.id);

  const skipAmount = (pageNum - 1) * pageSize;

  const aggregation = await Order.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(session.user.id),
        $or: [{ coinsEarned: { $gt: 0 } }, { coinsRedeemed: { $gt: 0 } }],
      },
    },
    {
      $project: {
        events: {
          $concatArrays: [
            {
              $cond: [
                {
                  $and: [
                    { $gt: ["$coinsEarned", 0] },
                    { $eq: ["$coinsCredited", true] },
                    {
                      $not: {
                        $in: ["$status", ["cancelled", "returned"]],
                      },
                    },
                  ],
                },
                [
                  {
                    _id: { $concat: ["earn-", { $toString: "$_id" }] },
                    type: "earned",
                    amount: "$coinsEarned",
                    date: { $ifNull: ["$paidAt", "$createdAt"] },
                    orderId: "$_id",
                  },
                ],
                [],
              ],
            },
            {
              $cond: [
                { $gt: ["$coinsRedeemed", 0] },
                [
                  {
                    _id: { $concat: ["redeem-", { $toString: "$_id" }] },
                    type: "redeemed",
                    amount: "$coinsRedeemed",
                    date: "$createdAt",
                    orderId: "$_id",
                  },
                ],
                [],
              ],
            },
          ],
        },
      },
    },
    { $unwind: "$events" },
    { $replaceRoot: { newRoot: "$events" } },
    { $sort: { date: -1 } },
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        history: [{ $skip: skipAmount }, { $limit: pageSize }],
        summary: [
          {
            $group: {
              _id: null,
              totalEarned: {
                $sum: {
                  $cond: [{ $eq: ["$type", "earned"] }, "$amount", 0],
                },
              },
              totalRedeemed: {
                $sum: {
                  $cond: [{ $eq: ["$type", "redeemed"] }, "$amount", 0],
                },
              },
              lastActivityAt: { $max: "$date" },
            },
          },
        ],
      },
    },
  ]);

  const totalEvents = aggregation[0]?.totalCount[0]?.count || 0;
  const history = aggregation[0]?.history || [];
  const summary = aggregation[0]?.summary?.[0];
  const currentBalance = user?.coins || 0;
  const totalEarned = summary?.totalEarned || 0;
  const totalRedeemed = summary?.totalRedeemed || 0;
  const lifetimeUsageRate =
    totalEarned > 0
      ? Math.min(100, Math.round((totalRedeemed / totalEarned) * 100))
      : 0;
  const lastActivity = summary?.lastActivityAt
    ? formatDateTime(new Date(summary.lastActivityAt)).dateOnly
    : "No activity yet";

  const formattedHistory: CoinHistoryEvent[] = history.map((event: any) => ({
    id: event._id,
    type: event.type,
    amount: event.amount,
    date: event.date,
    orderId: event.orderId?.toString(),
    description: `${event.type === "earned" ? "Earned from" : "Redeemed for"} Order ${formatId(event.orderId?.toString() || "")}`,
  }));

  return (
    <div className="space-y-8">
      <Breadcrumb />

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CoinsIcon className="h-7 w-7 text-primary" />
            My Coins
          </h1>
          <p className="text-muted-foreground text-sm">
            Track rewards, redemptions, and your coin value in one place
          </p>
        </div>

        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/search" prefetch>
            <ShoppingBag className="h-4 w-4" />
            Shop & Earn Coins
          </Link>
        </Button>
      </div>

      {/* BALANCE CARD */}
      <Card className="border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <CoinsIcon className="h-3.5 w-3.5 text-primary" />
                Current Balance
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                {formatNumberWithTwoDecimals(currentBalance)}
              </h2>
              <p className="text-sm text-muted-foreground">1 coin = 1 KES</p>
              <p className="text-xs text-muted-foreground">
                Coins can only be used on {site.name}
              </p>
            </div>

            <div className="rounded-xl border bg-background/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lifetime usage</span>
                <span className="font-semibold">{lifetimeUsageRate}%</span>
              </div>
              <Progress value={lifetimeUsageRate} aria-label="Lifetime usage" />
              <p className="text-xs text-muted-foreground">
                You have redeemed {formatNumberWithTwoDecimals(totalRedeemed)} of{" "}
                {formatNumberWithTwoDecimals(totalEarned)} earned coins.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="gap-2 py-4 shadow-none">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">Total earned</p>
                <p className="text-lg font-semibold text-green-600">
                  +{formatNumberWithTwoDecimals(totalEarned)}
                </p>
              </CardContent>
            </Card>
            <Card className="gap-2 py-4 shadow-none">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">Total redeemed</p>
                <p className="text-lg font-semibold text-red-600">
                  -{formatNumberWithTwoDecimals(totalRedeemed)}
                </p>
              </CardContent>
            </Card>
            <Card className="gap-2 py-4 shadow-none">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-lg font-semibold">
                  {formatNumber(totalEvents)} events
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Last activity: {lastActivity}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* HISTORY TABLE */}
      <div id="coins-history" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Transaction History
          </h2>
          <span className="text-xs text-muted-foreground">
            Page {pageNum} of {Math.max(1, Math.ceil(totalEvents / pageSize))}
          </span>
        </div>

        {formattedHistory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-muted-foreground">
                No coin activity yet. Start shopping to earn rewards.
              </p>
              <Button asChild>
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
              {formattedHistory.map((event) => (
                <Card key={event.id} className="gap-3 py-4">
                  <CardContent className="px-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge
                        variant={
                          event.type === "earned" ? "success" : "destructive"
                        }
                        className="flex items-center gap-1 w-fit"
                      >
                        {event.type === "earned" ? (
                          <ArrowUpCircle className="h-4 w-4" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4" />
                        )}
                        {event.type}
                      </Badge>
                      <p
                        className={cn(
                          "font-bold text-base",
                          event.type === "earned"
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {event.type === "earned" ? "+" : "-"}
                        {formatNumberWithTwoDecimals(event.amount)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-medium text-sm">{event.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(new Date(event.date)).dateTime}
                      </p>
                    </div>

                    <Button asChild variant="ghost" size="sm" className="px-0">
                      <Link href={`/account/orders/${event.orderId}#coins-history`}>
                        View Order
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
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
                  {formattedHistory.map((event) => (
                    <tr
                      key={event.id}
                      className="border-t hover:bg-muted/40 transition"
                    >
                      <td className="p-3">
                        <Badge
                          variant={
                            event.type === "earned" ? "success" : "destructive"
                          }
                          className="flex items-center gap-1 w-fit"
                        >
                          {event.type === "earned" ? (
                            <ArrowUpCircle className="h-4 w-4" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4" />
                          )}
                          {event.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{event.description}</td>
                      <td className="p-3 text-muted-foreground">
                        {formatDateTime(new Date(event.date)).dateTime}
                      </td>
                      <td
                        className={cn(
                          "p-3 text-right font-bold",
                          event.type === "earned"
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {event.type === "earned" ? "+" : "-"}
                        {formatNumberWithTwoDecimals(event.amount)}
                      </td>
                      <td className="p-3 text-right">
                        <Button asChild variant="link" size="sm" className="h-auto p-0">
                          <Link href={`/account/orders/${event.orderId}#coins-history`}>
                            View Order
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAGINATION */}
        {totalEvents > pageSize && (
          <div className="flex justify-center pt-4">
            <Pagination
              page={pageNum}
              totalPages={Math.ceil(totalEvents / pageSize)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
