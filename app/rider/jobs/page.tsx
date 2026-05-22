import { Metadata } from "next";
import Breadcrumb from "@/components/shared/breadcrumb";
import { getRiderJobsDashboard } from "@/lib/actions/rider.actions";
import RiderJobsClient from "./rider-jobs-client";

export const metadata: Metadata = {
  title: "Rider Jobs",
};

export default async function RiderJobsPage() {
  const data = await getRiderJobsDashboard();

  return (
    <div className="space-y-4">
      <Breadcrumb />
      <div>
        <h1 className="h1-bold">Rider Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Accept available jobs, confirm pickup, and complete deliveries with OTP.
        </p>
      </div>
      <RiderJobsClient data={data} />
    </div>
  );
}
