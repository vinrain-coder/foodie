"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

import { useCompareStore } from "@/hooks/useCompareStore";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { cn } from "@/lib/utils";

type CompareIconProps = {
  menuItem: IMenuItem;
  variant?: "icon" | "button";
  className?: string;
};

export default function CompareIcon({
  menuItem,
  variant = "button",
  className,
}: CompareIconProps) {
  const { addMenuItem, removeMenuItem, isInCompare, maxItems } =
    useCompareStore();

  const menuItemId = menuItem._id.toString();

  // ✅ hydration safety
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // prevent SSR/client mismatch
  const inCompare = mounted ? isInCompare(menuItemId) : false;

  const toggleCompare = () => {
    if (!mounted) return;

    if (inCompare) {
      removeMenuItem(menuItemId);
      toast.success("Removed from compare");
      return;
    }

    const result = addMenuItem(menuItem);

    if (result.added) {
      toast.success("Added to compare");
      return;
    }

    if (result.reason === "max") {
      toast.error(`You can compare up to ${maxItems} menuItems`);
      return;
    }

    toast.message("MenuItem is already in compare");
  };

  // Optional: render safe placeholder until mounted
  if (!mounted) {
    if (variant === "icon") {
      return (
        <button
          type="button"
          className="h-7 w-7 rounded-full bg-background/60 animate-pulse"
        />
      );
    }

    return (
      <button className="px-3 py-1 rounded-md bg-background/60 animate-pulse">
        Compare
      </button>
    );
  }

  // ICON variant
  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={inCompare ? "Remove from compare" : "Add to compare"}
        title={inCompare ? "Remove from compare" : "Add to compare"}
        className={cn(
          "relative h-7 w-7 flex items-center justify-center rounded-full",
          "bg-background/80 backdrop-blur-sm shadow-sm",
          "transition-all duration-200",
          "hover:bg-background hover:scale-105 active:scale-95 cursor-pointer",

          inCompare &&
            "bg-primary text-primary-foreground shadow-md hover:bg-primary/90",

          className,
        )}
        onClick={toggleCompare}
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>
    );
  }

  // BUTTON variant (IMPORTANT: you were missing this before)
  return (
    <button
      type="button"
      onClick={toggleCompare}
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-md border",
        "transition-all duration-200 hover:scale-[1.02]",
        inCompare
          ? "bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted",
        className,
      )}
    >
      <ArrowLeftRight className="h-4 w-4" />
      {inCompare ? "Remove from compare" : "Add to compare"}
    </button>
  );
}
