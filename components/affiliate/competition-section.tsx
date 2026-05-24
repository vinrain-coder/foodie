"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

type Cadence = "daily" | "weekly" | "monthly" | "yearly";

type LeaderboardEntry = {
  affiliateId: string;
  affiliateCode: string;
  displayName: string;
  rank: number;
  points: number;
  qualifiedRevenue: number;
  qualifiedOrders: number;
  updatedAt?: string;
  eligible: boolean;
  ineligibilityReason?: string | null;
};

type LeaderboardPeriod = {
  id: string;
  cadence: Cadence;
  startAt: string;
  endAt: string;
  status: string;
  timezone?: string;
};

type LeaderboardResponse = {
  period: LeaderboardPeriod | null;
  entries: LeaderboardEntry[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type LeaderboardMeResponse = {
  period: LeaderboardPeriod | null;
  entry: LeaderboardEntry | null;
};

const CADENCE_OPTIONS: Array<{ value: Cadence; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toCountdown = (target: string | undefined, nowMs: number) => {
  if (!target) return "--";
  const end = new Date(target).getTime();

  if (!Number.isFinite(end) || end <= nowMs) {
    return "Ended";
  }

  const seconds = Math.floor((end - nowMs) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

export default function AffiliateCompetitionSection() {
  const [cadence, setCadence] = useState<Cadence>("weekly");
  const [loading, setLoading] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [myRow, setMyRow] = useState<LeaderboardMeResponse | null>(null);
  const [nowAt, setNowAt] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowAt(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setLoadingMine(true);

      try {
        const [boardRes, meRes] = await Promise.all([
          fetch(`/api/affiliate/leaderboard?cadence=${cadence}&scope=current&page=1&limit=15`, {
            cache: "no-store",
          }),
          fetch(`/api/affiliate/leaderboard/me?cadence=${cadence}&scope=current`, {
            cache: "no-store",
          }),
        ]);

        const boardJson = (await boardRes.json()) as {
          success?: boolean;
          period?: LeaderboardPeriod | null;
          entries?: LeaderboardEntry[];
          pagination?: LeaderboardResponse["pagination"];
        };

        const meJson = (await meRes.json()) as {
          success?: boolean;
          period?: LeaderboardPeriod | null;
          entry?: LeaderboardEntry | null;
        };

        if (cancelled) return;

        if (boardJson.success) {
          setLeaderboard({
            period: boardJson.period || null,
            entries: boardJson.entries || [],
            pagination: boardJson.pagination,
          });
        } else {
          setLeaderboard({
            period: null,
            entries: [],
          });
        }

        if (meJson.success) {
          setMyRow({
            period: meJson.period || null,
            entry: meJson.entry || null,
          });
        } else {
          setMyRow({ period: null, entry: null });
        }
      } catch {
        if (cancelled) return;
        setLeaderboard({ period: null, entries: [] });
        setMyRow({ period: null, entry: null });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMine(false);
        }
      }
    };

    void fetchLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [cadence]);

  const period = leaderboard?.period || myRow?.period || null;
  const countdown = useMemo(() => toCountdown(period?.endAt, nowAt), [period?.endAt, nowAt]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Competitions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track your ranking in active affiliate competitions.
            </p>
          </div>

          <Tabs value={cadence} onValueChange={(value) => setCadence(value as Cadence)}>
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              {CADENCE_OPTIONS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {period ? (
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Period Start</p>
              <p className="font-medium">{formatDate(period.startAt)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Period End</p>
              <p className="font-medium">{formatDate(period.endAt)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Countdown</p>
              <p className="font-medium">{countdown}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active period found yet.</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Card className="border-dashed shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Rank</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMine ? (
              <Skeleton className="h-16 w-full" />
            ) : myRow?.entry ? (
              <div className="grid gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Rank</p>
                  <p className="text-xl font-semibold">#{myRow.entry.rank}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Points</p>
                  <p className="text-xl font-semibold">{myRow.entry.points}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(myRow.entry.qualifiedRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-xl font-semibold">{myRow.entry.qualifiedOrders}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You are not ranked in this period yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Affiliate</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Eligibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (leaderboard?.entries || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No leaderboard entries yet for this period.
                  </TableCell>
                </TableRow>
              ) : (
                (leaderboard?.entries || []).map((entry) => (
                  <TableRow key={`${entry.affiliateId}-${entry.rank}`}>
                    <TableCell>#{entry.rank}</TableCell>
                    <TableCell className="font-medium">{entry.displayName}</TableCell>
                    <TableCell>{entry.affiliateCode}</TableCell>
                    <TableCell className="text-right">{entry.points}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.qualifiedRevenue)}
                    </TableCell>
                    <TableCell className="text-right">{entry.qualifiedOrders}</TableCell>
                    <TableCell>
                      {entry.eligible ? (
                        <Badge variant="success">Eligible</Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="destructive">Ineligible</Badge>
                          {entry.ineligibilityReason ? (
                            <p className="text-xs text-muted-foreground">
                              {entry.ineligibilityReason}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
