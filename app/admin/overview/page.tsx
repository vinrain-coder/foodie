import { Metadata } from "next";

import OverviewReport from "./overview-report";
import { getServerSession } from "@/lib/get-session";
import { canAccessAdminDashboard } from "@/lib/dashboard-access";
export const metadata: Metadata = {
  title: "Admin Dashboard",
};
const DashboardPage = async () => {
  const session = await getServerSession();
  if (!canAccessAdminDashboard(session?.user.role))
    throw new Error("Admin permission required");

  return <OverviewReport />;
};

export default DashboardPage;
