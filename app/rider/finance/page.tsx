import type { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { canStartRiderOnboarding } from "@/lib/dashboard-access";
import Link from "next/link";
import { ArrowRight, Bike, Clock, TrendingUp, Wallet } from "lucide-react";
import Breadcrumb from "@/components/shared/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Rider Earnings",
  robots: PRIVATE_ROBOTS,
};

export default async function RiderFinancePage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/rider");
  if (!canStartRiderOnboarding(session.user.role)) redirect("/forbidden");

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1-bold">Earnings & Finance</h1>
          <p className="text-muted-foreground">
            Track your payouts, earnings history, and wallet balance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">KES 0.00</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime earnings
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Available Balance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">KES 0.00</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ready for payout
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">KES 0.00</p>
            <p className="text-xs text-muted-foreground mt-1">
              awaiting release
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Wallet className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">No payouts yet.</p>
            <p className="text-xs mt-1">
              Complete delivery jobs to start building your earnings.
            </p>
            <Link href="/rider/jobs">
              <Button className="mt-4">
                View Jobs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
