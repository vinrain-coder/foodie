"use client";

import { useEffect, useState, useTransition } from "react";
import { DateRange } from "react-day-picker";
import {
  getAffiliateDashboardData,
  getAffiliateAnalytics,
} from "@/lib/actions/affiliate.actions";
import { getSetting } from "@/lib/actions/setting.actions";
import { calculatePastDate, formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  ExternalLinkIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  BadgeCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import CopyButton from "@/components/shared/copy-button";
import Breadcrumb from "@/components/shared/breadcrumb";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PopoverClose } from "@radix-ui/react-popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import Price from "@/components/shared/menuItem/price";
import AffiliateCompetitionSection from "@/components/affiliate/competition-section";

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number | undefined }[];
  label?: string;
}

type EarningsPoint = {
  date: string;
  totalEarnings: number;
};

type MonthlyEarningPoint = {
  label: string;
  value: number;
};

type AffiliateDashboardData = {
  affiliate: {
    status: "approved" | "pending" | "rejected";
    adminNote?: string;
    earningsBalance: number;
    totalEarnings: number;
    affiliateCode: string;
  };
  recentEarnings: Array<{
    _id: string;
    amount: number;
    status: "earned" | "pending" | "cancelled";
    createdAt: string;
    order?: { trackingNumber?: string };
  }>;
  recentPayouts: Array<{
    _id: string;
    amount: number;
    status: "paid" | "pending" | "rejected";
    paymentMethod: string;
    createdAt: string;
  }>;
};

type AffiliateAnalyticsData = {
  earningsData: EarningsPoint[];
  monthlyEarnings: MonthlyEarningPoint[];
  totalEarningsInPeriod: number;
};

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length && payload[0].value !== undefined) {
    return (
      <Card>
        <CardContent className="p-2">
          <p>{label && formatDateTime(new Date(label)).dateOnly}</p>
          <p className="text-primary text-xl">
            <Price price={payload[0].value ?? 0} plain />
          </p>
        </CardContent>
      </Card>
    );
  }
  return null;
};

function EarningsAreaChart({ data }: { data: EarningsPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid
          horizontal={true}
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="totalEarnings"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="var(--primary)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MonthlyEarningsChart({ data }: { data: MonthlyEarningPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <CartesianGrid
          horizontal={true}
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="var(--primary)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CalendarDateRangePicker({
  defaultDate,
  setDate,
  className,
}: {
  defaultDate?: DateRange;
  setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  className?: string;
}) {
  const [calendarDate, setCalendarDate] = useState<DateRange | undefined>(
    defaultDate,
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !calendarDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-0 h-4 w-4" />
            {calendarDate?.from ? (
              calendarDate.to ? (
                <>
                  {formatDateTime(calendarDate.from).dateOnly} -{" "}
                  {formatDateTime(calendarDate.to).dateOnly}
                </>
              ) : (
                formatDateTime(calendarDate.from).dateOnly
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          onCloseAutoFocus={() => setCalendarDate(defaultDate)}
          className="w-auto p-0"
          align="end"
        >
          <Calendar
            mode="range"
            defaultMonth={defaultDate?.from}
            selected={calendarDate}
            onSelect={setCalendarDate}
            numberOfMonths={2}
          />
          <div className="flex gap-4 p-4 pt-0">
            <PopoverClose asChild>
              <Button onClick={() => setDate(calendarDate)}>Apply</Button>
            </PopoverClose>
            <PopoverClose asChild>
              <Button variant={"outline"}>Cancel</Button>
            </PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function AffiliateDashboardPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: calculatePastDate(30),
    to: new Date(),
  });

  const [dashboardData, setDashboardData] = useState<AffiliateDashboardData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AffiliateAnalyticsData | null>(null);
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchData = async () => {
      const dashResult = await getAffiliateDashboardData();
      if (dashResult.success && dashResult.data) {
        setDashboardData(dashResult.data);
      }
      const setting = await getSetting();
      setSiteUrl(setting.site?.url || "");
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (date) {
      startTransition(async () => {
        const analytics = await getAffiliateAnalytics({
          from: date.from?.toISOString(),
          to: date.to?.toISOString(),
        });
        if (analytics.success && analytics.data) {
          setAnalyticsData(analytics.data as AffiliateAnalyticsData);
        }
      });
    }
  }, [date]);

  if (!dashboardData) {
    return (
      <div className="container mx-auto py-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Affiliate Program</h1>
        <p className="mb-6">Loading...</p>
      </div>
    );
  }

  const { affiliate, recentEarnings, recentPayouts } = dashboardData;
  const referralLink = `${siteUrl}/affiliate/redirect?ref=${affiliate.affiliateCode}`;

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Breadcrumb />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              affiliate.status === "approved"
                ? "success"
                : affiliate.status === "pending"
                  ? "pending"
                  : "destructive"
            }
            className="flex items-center gap-1"
          >
            {affiliate.status === "approved" && (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {affiliate.status === "pending" && <Clock className="h-3 w-3" />}
            {affiliate.status === "rejected" && (
              <AlertCircle className="h-3 w-3" />
            )}
            Status: {affiliate.status.toUpperCase()}
          </Badge>

          <Button asChild variant="outline" size="sm">
            <Link href="/affiliate/payouts">Payout History</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Performance</h2>
          <p className="text-muted-foreground">
            View your earnings and commissions over time.
          </p>
        </div>
        <CalendarDateRangePicker defaultDate={date} setDate={setDate} />
      </div>

      {analyticsData && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Over Time</CardTitle>
              <CardDescription>
                {date?.from && date?.to
                  ? `${formatDateTime(date.from).dateOnly} - ${formatDateTime(date.to).dateOnly}`
                  : "Last 30 days"}
                {isPending ? " · Refreshing..." : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.earningsData.length > 0 ? (
                <EarningsAreaChart data={analyticsData.earningsData} />
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  No earnings data for selected period.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Earnings Summary</CardTitle>
              <CardDescription>Total earned in selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                <Price price={analyticsData.totalEarningsInPeriod} plain />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                From {analyticsData.earningsData.length} commission transactions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Monthly Earnings (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsData?.monthlyEarnings &&
          analyticsData.monthlyEarnings.length > 0 ? (
            <MonthlyEarningsChart data={analyticsData.monthlyEarnings} />
          ) : (
            <Skeleton className="h-48 w-full" />
          )}
        </CardContent>
      </Card>

      <AffiliateCompetitionSection />

      {/* ❌ REJECTED STATE */}
      {affiliate.status === "rejected" && (
        <Card className="border border-red-200/60 bg-red-50/40 dark:bg-red-950/10 rounded-xl">
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm font-semibold text-red-700">
              Your application was rejected.
            </p>

            {affiliate.adminNote ? (
              <p className="text-sm text-red-700/90">
                Reason: {affiliate.adminNote}
              </p>
            ) : (
              <p className="text-sm text-red-700/90">
                Please review your application details and submit again.
              </p>
            )}

            <Button asChild size="sm" variant="destructive">
              <Link href="/affiliate/register">Update & Reapply</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 📊 MODERN STATS CARDS (UPDATED STYLE) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[
          {
            id: "balance",
            label: "Current Balance",
            value: affiliate.earningsBalance,
            isPrice: true,
            icon: Wallet,
            hint: "Available for withdrawal",
            color:
              "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
          },
          {
            id: "total",
            label: "Total Earnings",
            value: affiliate.totalEarnings,
            isPrice: true,
            icon: TrendingUp,
            hint: "Lifetime commissions earned",
            color:
              "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
          },
          {
            id: "code",
            label: "Affiliate Code",
            value: affiliate.affiliateCode,
            isPrice: false,
            icon: BadgeCheck,
            hint: "Your unique referral ID",
            color:
              "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.id}
              className={cn(
                "rounded-xl border-2 border-primary/20 border-dashed p-3 sm:p-4 transition-all",
                "hover:ring-2 hover:ring-primary/20 hover:shadow-sm",
              )}
            >
              <div className="flex flex-col items-center text-center gap-1">
                <div className={cn("rounded-full p-2 mb-1", stat.color)}>
                  <Icon className="h-4 w-4" />
                </div>

                <p className="text-[10px] sm:text-xs uppercase tracking-tight text-muted-foreground">
                  {stat.label}
                </p>

                <div className="flex items-center justify-center gap-2">
                  <p className="text-lg sm:text-xl font-bold leading-tight">
                    {stat.isPrice
                      ? formatCurrency(stat.value as number)
                      : stat.value}
                  </p>

                  {stat.id === "code" && (
                    <CopyButton value={String(stat.value)} />
                  )}
                </div>

                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {stat.hint}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔗 REFERRAL LINK */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <code className="block w-full pr-20 p-3 bg-muted rounded-lg border truncate text-sm">
                {referralLink}
              </code>

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <CopyButton value={referralLink} />

                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <a
                    href={referralLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Share this link with your audience. When they make a purchase using
            your link, you earn commission!
          </p>
        </CardContent>
      </Card>

      {/* 📦 TABLES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEarnings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No earnings yet.
              </p>
            ) : (
              <div className="space-y-4">
                {recentEarnings.map((earning) => (
                  <div
                    key={earning._id}
                    className="flex justify-between items-center border-b pb-2"
                  >
                    <div>
                      <p className="font-medium">
                        Order #{earning.order?.trackingNumber || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(earning.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        +{formatCurrency(earning.amount)}
                      </p>

                      <Badge
                        variant={
                          earning.status === "earned"
                            ? "success"
                            : earning.status === "pending"
                              ? "pending"
                              : "destructive"
                        }
                        className="text-[10px] h-4 flex items-center gap-1"
                      >
                        {earning.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayouts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payout history.
              </p>
            ) : (
              <div className="space-y-4">
                {recentPayouts.map((payout) => (
                  <div
                    key={payout._id}
                    className="flex justify-between items-center border-b pb-2"
                  >
                    <div>
                      <p className="font-medium">{payout.paymentMethod}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        -{formatCurrency(payout.amount)}
                      </p>

                      <Badge
                        variant={
                          payout.status === "paid"
                            ? "success"
                            : payout.status === "pending"
                              ? "pending"
                              : "destructive"
                        }
                        className="text-[10px] flex items-center gap-1"
                      >
                        {payout.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


