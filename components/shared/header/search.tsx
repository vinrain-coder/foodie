"use client";

import { SearchIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAllMenuItems } from "@/lib/actions/menu.item.actions";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

export default function Search({
  categories,
  siteName,
  autoFocus = false,
}: {
  categories: string[];
  siteName: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [suggestions, setSuggestions] = useState<IMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [autoFocus]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);
      setActiveIndex(-1);
      try {
        const res = await getAllMenuItems({
          query,
          category,
          limit: 6,
          page: 1,
          tag: "all",
        });
        setSuggestions(res.menuItems);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, category]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSuggestionClick(suggestions[activeIndex].slug);
    } else if (query.trim()) {
      router.push(`/search?q=${query}&category=${category}`);
    } else {
      router.push(`/search?category=${category}`);
    }
  };

  const handleSuggestionClick = (slug: string) => {
    setIsOpen(false);
    router.push(`/menu-item/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <form
        onSubmit={handleSubmit}
        className="flex h-11 items-stretch overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs"
        role="search"
      >
        <Select
          name="category"
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setActiveIndex(-1);
          }}
        >
          <SelectTrigger className="h-full w-auto rounded-none border-0 border-r border-border/80 bg-muted/60 pr-2 pl-2.5 text-foreground shadow-none focus:ring-0">
            <SelectValue placeholder="All" className="text-foreground" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={inputRef}
          className="h-full flex-1 rounded-none border-0 bg-transparent text-sm md:text-base shadow-none focus-visible:ring-0"
          placeholder={`Search ${siteName}`}
          name="q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="search-results"
          aria-autocomplete="list"
          autoFocus={autoFocus}
        />
        <button
          type="submit"
          className="flex h-full cursor-pointer items-center justify-center border-l border-border/80 bg-primary px-3 text-primary-foreground transition-opacity hover:opacity-90"
          aria-label="Search"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
      </form>

      {isOpen && (
        <div
          id="search-results"
          className="absolute z-50 mt-2 max-h-100 w-full overflow-y-auto rounded-xl border bg-popover shadow-lg"
          role="listbox"
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Searching...
              </span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1.5">
              {suggestions.map((menuItem, index) => (
                <li
                  key={menuItem._id.toString()}
                  onClick={() => handleSuggestionClick(menuItem.slug)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
                    index === activeIndex ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="relative w-12 h-12 shrink-0">
                    <Image
                      src={menuItem.images[0]}
                      alt={menuItem.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover rounded-md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {menuItem.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(menuItem.price)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
