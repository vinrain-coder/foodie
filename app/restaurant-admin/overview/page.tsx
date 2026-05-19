import { Metadata } from "next";

import OverviewReport from "./overview-report";
import { getServerSession } from "@/lib/get-session";
import { canAccessAdminDashboard } from "@/lib/dashboard-access";
export const metadata: Metadata = {
  title: "Restaurant Dashboard",
};
const DashboardPage = async () => {
  const session = await getServerSession();
  if (!canAccessAdminDashboard(session?.user.role))
    throw new Error("Restaurant permission required");

  return <OverviewReport />;
};

export default DashboardPage;
