import { Metadata } from "next";
import { getAdminDispatchTimeline } from "@/lib/actions/rider.actions";
import OpsConsoleClient from "./ops-console-client";

export const metadata: Metadata = {
  title: "Ops Dispatch Console",
};

export default async function AdminRiderDispatchPage() {
  const data = await getAdminDispatchTimeline();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1-bold">Ops/Admin Dispatch Console</h1>
        <p className="text-muted-foreground">
          Live fleet map, dispatch control actions, SLA metrics, and rider performance monitoring.
        </p>
      </div>
      <OpsConsoleClient data={data} />
    </div>
  );
}
