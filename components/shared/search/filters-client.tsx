"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { X } from "lucide-react";

import SelectedFiltersPills from "./selected-filters-pills";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PriceControl from "./price-control";
import FilterButton from "./filter-button";
import { Input } from "@/components/ui/input";

type ParamsShape = {
  q?: string;
  category?: string;
  tag?: string;
  price?: string;
  rating?: string;
  sort?: string;
  page?: string;
};

type FiltersConfig = {
  basePath?: string;
  lockCategory?: boolean;
  lockTag?: boolean;
};

export default function FiltersClient({
  initialParams,
  categories,
  tags,
  basePath = "/search",
  lockCategory = false,
  lockTag = false,
}: {
  initialParams?: ParamsShape;
  categories: string[];
  tags: string[];
} & FiltersConfig) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // --- Current URL parameters ---
  const current: ParamsShape = {
    q: searchParams.get("q") ?? initialParams?.q ?? "all",
    category: searchParams.get("category") ?? initialParams?.category ?? "all",
    tag: searchParams.get("tag") ?? initialParams?.tag ?? "all",
    price: searchParams.get("price") ?? initialParams?.price ?? "all",
    rating: searchParams.get("rating") ?? initialParams?.rating ?? "all",
    sort: searchParams.get("sort") ?? initialParams?.sort ?? "best-selling",
    page: searchParams.get("page") ?? initialParams?.page ?? "1",
  };

  const [open, setOpen] = useState(false);

  const [categorySearch, setCategorySearch] = useState("");

  const dCategorySearch = useDebounce(categorySearch);

  const filteredCategories = useMemo(
    () =>
      categories.filter((c) =>
        c.toLowerCase().includes(dCategorySearch.toLowerCase()),
      ),
    [categories, dCategorySearch],
  );

  const defaultAccordionValues = useMemo(
    () =>
      [
        current.category !== "all" && "categories",
        current.price !== "all" && "price",
        current.rating !== "all" && "rating",
        current.tag !== "all" && "tags",
      ].filter(Boolean) as string[],
    [current],
  );

  const [openAccordions, setOpenAccordions] = useState<string[]>(
    defaultAccordionValues,
  );

  // --- Helpers ---
  function buildSearchUrl(params: ParamsShape) {
    const p = new URLSearchParams();
    if (params.q && params.q !== "all") p.set("q", params.q);
    if (!lockCategory && params.category && params.category !== "all") {
      p.set("category", params.category);
    }
    if (!lockTag && params.tag && params.tag !== "all") {
      p.set("tag", params.tag);
    }
    if (params.price && params.price !== "all") p.set("price", params.price);
    if (params.rating && params.rating !== "all")
      p.set("rating", params.rating);
    if (params.sort) p.set("sort", params.sort);
    if (params.page) p.set("page", params.page);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  }

  function updateParam(key: keyof ParamsShape, value: string | undefined) {
    const next: ParamsShape = { ...current, page: "1" };

    if (lockCategory && key === "category") return;
    if (lockTag && key === "tag") return;

    if (!value || value === "all") delete next[key];
    else next[key] = value;

    startTransition(() => {
      router.push(buildSearchUrl(next));
    });
  }

  function handleRemove(key: keyof ParamsShape) {
    updateParam(key, undefined);
  }

  function clearAllLocal() {
    startTransition(() => {
      router.push(basePath);
    });
  }

  function applyPriceFromControl(value: string) {
    updateParam("price", value);
  }

  function useDebounce<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);

    return debounced;
  }

  // --- Filters content (desktop + mobile scroll) ---

  const renderFiltersContent = (isDesktop = false) => {
    const sections = [
      {
        id: "categories",
        title: "Categories",
        visible: !lockCategory,
        content: (
          <>
            <Input
              placeholder="Search categories…"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="rounded-full"
            />

            <div className="overflow-y-auto flex flex-wrap gap-2 pr-1">
              <FilterButton
                disabled={current.category === "all"}
                active={current.category === "all"}
                onClick={() => updateParam("category", "all")}
              >
                All
              </FilterButton>

              {filteredCategories.map((c) => (
                <FilterButton
                  key={c}
                  active={current.category === c}
                  onClick={() => updateParam("category", c)}
                >
                  {c}
                </FilterButton>
              ))}
            </div>
          </>
        ),
      },
      {
        id: "gender",
        title: "Gender",
        visible: true,
      },
      {
        id: "price",
        title: "Price",
        visible: true,
        content: (
          <PriceControl
            initialPrice={current.price ?? "all"}
            onApply={applyPriceFromControl}
          />
        ),
      },
      {
        id: "rating",
        title: "Customer Review",
        visible: true,
        content: (
          <div className="flex flex-wrap gap-2">
            <FilterButton
              disabled={current.rating === "all"}
              active={current.rating === "all"}
              onClick={() => updateParam("rating", "all")}
            >
              All
            </FilterButton>

            <FilterButton
              active={current.rating === "4"}
              onClick={() => updateParam("rating", "4")}
            >
              4 & Up
            </FilterButton>
          </div>
        ),
      },
      {
        id: "tags",
        title: "Tags",
        visible: !lockTag,
        content: (
          <div className="overflow-y-auto flex flex-wrap gap-2 pr-1">
            <FilterButton
              disabled={current.tag === "all"}
              active={current.tag === "all"}
              onClick={() => updateParam("tag", "all")}
            >
              All
            </FilterButton>

            {tags.map((t) => (
              <FilterButton
                key={t}
                active={current.tag === t}
                onClick={() => updateParam("tag", t)}
              >
                {t}
              </FilterButton>
            ))}
          </div>
        ),
      },
    ];

    if (isDesktop) {
      return (
        <div className="space-y-8">
          {sections
            .filter((s) => s.visible)
            .map((s) => (
              <div key={s.id} className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  {s.title}
                </h3>
                {s.content}
              </div>
            ))}
        </div>
      );
    }

    return (
      <Accordion
        type="multiple"
        value={openAccordions}
        onValueChange={setOpenAccordions}
        className="space-y-4"
      >
        {sections
          .filter((s) => s.visible)
          .map((s) => (
            <AccordionItem key={s.id} value={s.id}>
              <AccordionTrigger className="font-bold">
                {s.title}
              </AccordionTrigger>
              <AccordionContent>{s.content}</AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    );
  };

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden mb-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <div className="flex items-center gap-2 py-2">
            <SheetTrigger asChild>
              <Button variant="pending" className="rounded-full">
                Filters
              </Button>
            </SheetTrigger>

            <div className="flex-1">
              <SelectedFiltersPills params={current} onRemove={handleRemove} />
            </div>
          </div>

          <SheetContent className="p-4 shadow-lg w-[90vw]!">
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="flex flex-row items-center justify-between px-2 border-b sticky top-0 bg-background z-20">
                <SheetTitle>Filters</SheetTitle>
                <SheetClose asChild>
                  <Button variant="ghost">
                    <X />
                  </Button>
                </SheetClose>
              </SheetHeader>

              {/* Selected filters */}
              <div className="p-4 shadow-xs">
                <SelectedFiltersPills
                  params={current}
                  onRemove={handleRemove}
                />
              </div>

              {/* Filters content */}
              <div
                className="overflow-auto p-0"
                style={{ maxHeight: "calc(100vh - 180px)" }}
              >
                {renderFiltersContent(false)}
              </div>

              {/* Footer buttons */}
              <div className="p-2 flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={clearAllLocal}
                >
                  Clear All
                </Button>

                <SheetClose asChild>
                  <Button className="flex-1">View Results</Button>
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop */}
      <aside className="hidden md:block md:col-span-1">
        <div className="sticky top-10 h-[calc(100vh-5rem)] overflow-auto p-4 border rounded-lg bg-card">
          <div className="mb-3">
            <div className="font-bold">Filters</div>
          </div>
          <div className="mb-3">
            <SelectedFiltersPills params={current} onRemove={handleRemove} />
          </div>
          {renderFiltersContent(true)}
        </div>
      </aside>
    </>
  );
}
