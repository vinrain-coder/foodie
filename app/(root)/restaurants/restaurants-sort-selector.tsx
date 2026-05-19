"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sortOrders = [
  { value: "newest", name: "Newest" },
  { value: "oldest", name: "Oldest" },
  { value: "name-asc", name: "Name: A to Z" },
  { value: "name-desc", name: "Name: Z to A" },
];

type RestaurantsSortParams = {
  q?: string;
  cuisine?: string;
  service?: string;
  location?: string;
  sort?: string;
  page?: string;
};

function buildRestaurantsUrl(params: RestaurantsSortParams, sort: string) {
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
  if (sort !== "newest") search.set("sort", sort);
  const queryString = search.toString();
  return queryString ? `/restaurants?${queryString}` : "/restaurants";
}

export default function RestaurantsSortSelector({
  sort,
  params,
}: {
  sort: string;
  params: RestaurantsSortParams;
}) {
  const router = useRouter();

  return (
    <Select
      value={sort}
      onValueChange={(value) => {
        router.push(buildRestaurantsUrl(params, value));
      }}
    >
      <SelectTrigger className="cursor-pointer">
        <SelectValue>
          Sort By: {sortOrders.find((s) => s.value === sort)?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortOrders.map((sortOrder) => (
          <SelectItem
            key={sortOrder.value}
            value={sortOrder.value}
            className="cursor-pointer"
          >
            {sortOrder.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
