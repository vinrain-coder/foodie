"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SearchIcon, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Search from "./search";

type MobileSearchToggleProps = {
  categories: string[];
  siteName: string;
};

export default function MobileSearchToggle({
  categories,
  siteName,
}: MobileSearchToggleProps) {
  const [open, setOpen] = useState(false);
  const [panelTop, setPanelTop] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParamsKey]);

  useEffect(() => {
    if (!open) return;

    const updatePanelTop = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelTop(rect.bottom + 8);
    };

    updatePanelTop();

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePanelTop);
    window.addEventListener("scroll", updatePanelTop, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePanelTop);
      window.removeEventListener("scroll", updatePanelTop);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative md:hidden">
      <button
        type="button"
        className={cn(
          "header-icon-button cursor-pointer",
          open && "border-border bg-accent text-foreground",
        )}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Hide search bar" : "Show search bar"}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X className="h-5 w-5" /> : <SearchIcon className="h-5 w-5" />}
      </button>

      <div
        id={panelId}
        className={cn(
          "fixed left-2 right-2 z-50 rounded-xl border border-border/70 bg-background/95 p-2 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/85 transition-all duration-200",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
        aria-hidden={!open}
        style={panelTop ? { top: `${panelTop}px` } : undefined}
      >
        {open ? (
          <Search categories={categories} siteName={siteName} autoFocus />
        ) : null}
      </div>
    </div>
  );
}
