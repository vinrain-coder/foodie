import { getServerSession } from "@/lib/get-session";
import { isAdminRole } from "@/lib/dashboard-access";
import { redirect } from "next/navigation";

export default async function AdminOnlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/forbidden");
  }

  return <>{children}</>;
}
