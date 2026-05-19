"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const statuses = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "processing",
    label: "Processing",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
];

export default function PayoutStatusTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }

    params.set("page", "1");

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <Tabs value={currentStatus} onValueChange={handleChange} className="mb-6">
      <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
        {statuses.map((status) => (
          <TabsTrigger
            key={status.value}
            value={status.value}
            className="
              rounded-lg border
              data-[state=active]:bg-secondary
              data-[state=active]:text-primary-foreground
              transition-all
              cursor-pointer
            "
          >
            {status.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
