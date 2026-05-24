import Link from "next/link";
import { Button } from "@/components/ui/button";
import AffiliateCompetitionsAdminClient from "./competitions-admin-client";

export default function AffiliateCompetitionsAdminPage() {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Competitions</h1>
          <p className="text-muted-foreground">
            Monitor standings freshness, period history, and reconciliation health.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/admin/affiliates">Back to Affiliates</Link>
        </Button>
      </div>

      <AffiliateCompetitionsAdminClient />
    </div>
  );
}
