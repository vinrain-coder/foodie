"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type QueueSummary = {
  pending: number;
  failed: number;
};

const CADENCES: Array<{ value: Cadence; label: string }> = [
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

export default function AffiliateCompetitionsAdminClient() {
  const [cadence, setCadence] = useState<Cadence>("weekly");
  const [periods, setPeriods] = useState<LeaderboardPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("current");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [activePeriod, setActivePeriod] = useState<LeaderboardPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueSummary, setQueueSummary] = useState<QueueSummary>({
    pending: 0,
    failed: 0,
  });
  const [runningAction, setRunningAction] = useState<"refresh" | "reconcile" | null>(null);

  const [adjustAffiliateId, setAdjustAffiliateId] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("0");
  const [adjustRevenue, setAdjustRevenue] = useState("0");
  const [adjustOrders, setAdjustOrders] = useState("0");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustResult, setAdjustResult] = useState<string>("");

  const periodOptions = useMemo(
    () => [
      { id: "current", label: "Current Period" },
      ...periods.map((period) => ({
        id: period.id,
        label: `${formatDate(period.startAt)} - ${formatDate(period.endAt)} (${period.status})`,
      })),
    ],
    [periods],
  );

  const fetchQueueSummary = async () => {
    const response = await fetch("/api/admin/affiliate/competitions/ops", {
      cache: "no-store",
    });
    const json = (await response.json()) as {
      success?: boolean;
      queue?: { pending?: number; failed?: number };
    };

    if (json.success) {
      setQueueSummary({
        pending: Number(json.queue?.pending || 0),
        failed: Number(json.queue?.failed || 0),
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadPeriods = async () => {
      const response = await fetch(
        `/api/affiliate/leaderboard/periods?cadence=${cadence}&limit=15`,
        {
          cache: "no-store",
        },
      );
      const json = (await response.json()) as {
        success?: boolean;
        items?: LeaderboardPeriod[];
      };

      if (cancelled) return;

      setPeriods(json.success ? json.items || [] : []);
      setSelectedPeriodId("current");
    };

    void loadPeriods();
    void fetchQueueSummary();

    return () => {
      cancelled = true;
    };
  }, [cadence]);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      setLoading(true);

      const query =
        selectedPeriodId === "current"
          ? `/api/affiliate/leaderboard?cadence=${cadence}&scope=current&page=1&limit=25`
          : `/api/affiliate/leaderboard?cadence=${cadence}&periodId=${selectedPeriodId}&scope=range&page=1&limit=25`;

      try {
        const response = await fetch(query, { cache: "no-store" });
        const json = (await response.json()) as {
          success?: boolean;
          period?: LeaderboardPeriod | null;
          entries?: LeaderboardEntry[];
        };

        if (cancelled) return;

        setActivePeriod(json.success ? json.period || null : null);
        setEntries(json.success ? json.entries || [] : []);
      } catch {
        if (cancelled) return;
        setActivePeriod(null);
        setEntries([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [cadence, selectedPeriodId]);

  const triggerAction = async (action: "refresh" | "reconcile") => {
    setRunningAction(action);

    try {
      const response = await fetch("/api/admin/affiliate/competitions/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, cadence }),
      });
      const json = (await response.json()) as {
        success?: boolean;
      };

      if (json.success) {
        setAdjustResult(`${action} completed`);
      } else {
        setAdjustResult(`${action} failed`);
      }
    } catch {
      setAdjustResult(`${action} failed`);
    } finally {
      setRunningAction(null);
      void fetchQueueSummary();
    }
  };

  const submitAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdjusting(true);
    setAdjustResult("");

    try {
      const response = await fetch("/api/admin/affiliate/competitions/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId: adjustAffiliateId,
          cadence,
          pointsDelta: Number(adjustPoints || 0),
          qualifiedRevenueDelta: Number(adjustRevenue || 0),
          qualifiedOrdersDelta: Number(adjustOrders || 0),
          reason: adjustReason,
        }),
      });

      const json = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      setAdjustResult(
        json.success ? "Manual adjustment applied" : json.message || "Adjustment failed",
      );
    } catch {
      setAdjustResult("Adjustment failed");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Competition Monitor</CardTitle>

            <Tabs value={cadence} onValueChange={(value) => setCadence(value as Cadence)}>
              <TabsList className="grid grid-cols-4 w-full md:w-auto">
                {CADENCES.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Card className="border-dashed shadow-none">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Queue Pending</p>
                <p className="text-2xl font-semibold">{queueSummary.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-dashed shadow-none">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Queue Failed</p>
                <p className="text-2xl font-semibold">{queueSummary.failed}</p>
              </CardContent>
            </Card>
            <Card className="border-dashed shadow-none md:col-span-2">
              <CardContent className="flex flex-wrap items-center gap-2 pt-4">
                <Button
                  type="button"
                  onClick={() => void triggerAction("refresh")}
                  disabled={runningAction !== null}
                >
                  {runningAction === "refresh" ? "Refreshing..." : "Refresh Standings"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void triggerAction("reconcile")}
                  disabled={runningAction !== null}
                >
                  {runningAction === "reconcile" ? "Reconciling..." : "Run Reconciliation"}
                </Button>
                {adjustResult ? (
                  <p className="text-sm text-muted-foreground">{adjustResult}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Leaderboard Preview</CardTitle>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="w-full sm:w-[420px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activePeriod ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{activePeriod.status}</Badge>
              <span>
                {formatDate(activePeriod.startAt)} - {formatDate(activePeriod.endAt)}
              </span>
              <span>Timezone: {activePeriod.timezone || "UTC"}</span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead>Eligibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Loading standings...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No entries for selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
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
                          <Badge variant="destructive">Ineligible</Badge>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual Adjustment (API-backed)</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitAdjustment}>
            <div className="space-y-2">
              <Label htmlFor="affiliate-id">Affiliate ID</Label>
              <Input
                id="affiliate-id"
                value={adjustAffiliateId}
                onChange={(event) => setAdjustAffiliateId(event.target.value)}
                placeholder="Mongo ObjectId"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">Reason</Label>
              <Input
                id="adjust-reason"
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
                placeholder="Adjustment reason"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Points Delta</Label>
              <Input
                id="points"
                value={adjustPoints}
                onChange={(event) => setAdjustPoints(event.target.value)}
                type="number"
                step="1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue Delta</Label>
              <Input
                id="revenue"
                value={adjustRevenue}
                onChange={(event) => setAdjustRevenue(event.target.value)}
                type="number"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orders">Orders Delta</Label>
              <Input
                id="orders"
                value={adjustOrders}
                onChange={(event) => setAdjustOrders(event.target.value)}
                type="number"
                step="1"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={adjusting}>
                {adjusting ? "Applying..." : "Apply Adjustment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
