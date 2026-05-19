"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import FilterButton from "@/components/shared/search/filter-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type RestaurantSearchParams = {
  q?: string;
  cuisine?: string;
  service?: string;
  location?: string;
  sort?: string;
  page?: string;
};

function buildRestaurantsUrl(params: RestaurantSearchParams) {
  const search = new URLSearchParams();
  if (params.q && params.q !== "all") search.set("q", params.q);
  if (params.cuisine && params.cuisine !== "all") {
    search.set("cuisine", params.cuisine);
  }
  if (params.service && params.service !== "all") {
    search.set("service", params.service);
  }
  if (params.location && params.location !== "all") {
    search.set("location", params.location);
  }
  if (params.sort && params.sort !== "newest") search.set("sort", params.sort);
  if (params.page && params.page !== "1") search.set("page", params.page);
  const queryString = search.toString();
  return queryString ? `/restaurants?${queryString}` : "/restaurants";
}

export default function RestaurantsFiltersClient({
  initialParams,
  cuisines,
  locations,
}: {
  initialParams: RestaurantSearchParams;
  cuisines: string[];
  locations: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current: RestaurantSearchParams = {
    q: searchParams.get("q") ?? initialParams.q ?? "all",
    cuisine: searchParams.get("cuisine") ?? initialParams.cuisine ?? "all",
    service: searchParams.get("service") ?? initialParams.service ?? "all",
    location: searchParams.get("location") ?? initialParams.location ?? "all",
    sort: searchParams.get("sort") ?? initialParams.sort ?? "newest",
    page: searchParams.get("page") ?? initialParams.page ?? "1",
  };

  const [queryInput, setQueryInput] = useState(
    current.q !== "all" ? current.q || "" : "",
  );

  useEffect(() => {
    const next = current.q !== "all" ? current.q || "" : "";
    setQueryInput(next);
  }, [current.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = queryInput.trim();
      const next: RestaurantSearchParams = {
        ...current,
        q: normalized || "all",
        page: "1",
      };
      const currentUrl = buildRestaurantsUrl(current);
      const nextUrl = buildRestaurantsUrl(next);
      if (currentUrl === nextUrl) return;
      startTransition(() => {
        router.push(nextUrl);
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [
    queryInput,
    current.q,
    current.cuisine,
    current.service,
    current.location,
    current.sort,
    current.page,
    router,
  ]);

  const applyFilter = (key: keyof RestaurantSearchParams, value: string) => {
    const next = {
      ...current,
      [key]: value,
      page: "1",
    };
    startTransition(() => {
      router.push(buildRestaurantsUrl(next));
    });
  };

  const clearAll = () => {
    startTransition(() => {
      router.push("/restaurants");
    });
  };

  const serviceLabel = useMemo(() => {
    if (current.service === "delivery") return "Delivery only";
    if (current.service === "pickup") return "Pickup only";
    if (current.service === "both") return "Delivery + Pickup";
    return "All services";
  }, [current.service]);

  return (
    <aside className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-semibold">Search</div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search restaurants..."
            className="pl-8"
          />
          {isPending ? (
            <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Cuisine</div>
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={current.cuisine === "all"}
            disabled={current.cuisine === "all"}
            onClick={() => applyFilter("cuisine", "all")}
          >
            All
          </FilterButton>
          {cuisines.map((cuisine) => (
            <FilterButton
              key={cuisine}
              active={current.cuisine === cuisine}
              onClick={() => applyFilter("cuisine", cuisine)}
            >
              {cuisine}
            </FilterButton>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Service</div>
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={current.service === "all"}
            disabled={current.service === "all"}
            onClick={() => applyFilter("service", "all")}
          >
            All
          </FilterButton>
          <FilterButton
            active={current.service === "delivery"}
            onClick={() => applyFilter("service", "delivery")}
          >
            Delivery
          </FilterButton>
          <FilterButton
            active={current.service === "pickup"}
            onClick={() => applyFilter("service", "pickup")}
          >
            Pickup
          </FilterButton>
          <FilterButton
            active={current.service === "both"}
            onClick={() => applyFilter("service", "both")}
          >
            Both
          </FilterButton>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Location</div>
        <Select
          value={current.location || "all"}
          onValueChange={(value) => applyFilter("location", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Active: {serviceLabel}
      </div>

      <Button variant="outline" className="w-full" onClick={clearAll}>
        Clear filters
      </Button>
    </aside>
  );
}
