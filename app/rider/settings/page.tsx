import type { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { redirect, notFound } from "next/navigation";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { isRiderRole, canAccessRiderDashboard } from "@/lib/dashboard-access";
import Breadcrumb from "@/components/shared/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rider Settings",
  robots: PRIVATE_ROBOTS,
};

export default async function RiderSettingsPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/rider");
  if (!canAccessRiderDashboard(session.user.role))
    redirect("/forbidden");
  if (!isRiderRole(session.user.role)) redirect("/forbidden");

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div>
        <h1 className="h1-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your rider account preferences and security.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                defaultValue={session.user.name}
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Contact support to update your name.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                defaultValue={session.user.email}
                readOnly
                disabled
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">
                  Job &amp; dispatch email alerts
                </p>
                <p className="text-xs text-muted-foreground">
                  Receive job offers and order updates via email
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 accent-primary"
                aria-label="Job email alerts"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">SMS alerts</p>
                <p className="text-xs text-muted-foreground">
                  Receive critical alerts via SMS
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                aria-label="SMS alerts"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Payout notifications</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when a payout is processed
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 accent-primary"
                aria-label="Payout notifications"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Changes to preferences are managed at the account level. Use
              the form below to contact support.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value="••••••••"
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Use the account page to reset your password.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/account/manage">Manage Account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
