import { notFound } from "next/navigation";

import { getOrderById } from "@/lib/actions/order.actions";
import OrderDetailsForm from "@/components/shared/order/order-details-form";
import Link from "next/link";
import { getServerSession } from "@/lib/get-session";
import { canAccessAdminDashboard } from "@/lib/dashboard-access";

export const metadata = {
  title: "Restaurant Order Details",
};

const AdminOrderDetailsPage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const params = await props.params;

  const { id } = params;

  const order = await getOrderById(id);
  if (!order) notFound();

  const session = await getServerSession();

  if (!canAccessAdminDashboard(session?.user?.role)) {
    throw new Error("Restaurant permission required");
  }

  return (
    <main className="max-w-6xl mx-auto p-4">
      <div className="flex mb-4">
        <Link href="/restaurant-admin/orders">Orders</Link> <span className="mx-1">›</span>
        <Link href={`/restaurant-admin/orders/${order._id}`}>{order._id}</Link>
      </div>
      <OrderDetailsForm
        order={order}
        isAdmin={canAccessAdminDashboard(session?.user?.role)}
      />
    </main>
  );
};

export default AdminOrderDetailsPage;
