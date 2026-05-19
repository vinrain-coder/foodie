import { Metadata } from "next";

import { getServerSession } from "@/lib/get-session";
import AnalyticsReport from "./analytics-report";
import { canAccessAdminDashboard } from "@/lib/dashboard-access";

export const metadata: Metadata = {
  title: "Web Analytics",
};

export default async function AdminAnalyticsPage() {
  const session = await getServerSession();
  if (!canAccessAdminDashboard(session?.user.role)) {
    throw new Error("Restaurant permission required");
  }

  return <AnalyticsReport />;
}
