"use client";

import { Button } from "@/components/ui/button";
import { useCompareStore } from "@/hooks/useCompareStore";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { cn } from "@/lib/utils";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

type CompareButtonProps = {
  menuItem: IMenuItem;
  variant?: "icon" | "button";
  className?: string;
};

export default function CompareButton({
  menuItem,
  variant = "button",
  className,
}: CompareButtonProps) {
  const { addMenuItem, removeMenuItem, isInCompare, maxItems } =
    useCompareStore();
  const menuItemId = menuItem._id.toString();
  const inCompare = isInCompare(menuItemId);

  const toggleCompare = () => {
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
      toast.error(`You can compare up to ${maxItems} menu items`);
      return;
    }

    toast.message("MenuItem is already in compare");
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={inCompare ? "Remove from compare" : "Add to compare"}
        title={inCompare ? "Remove from compare" : "Add to compare"}
        className={cn(
          "rounded-full bg-background p-1.5 shadow transition hover:bg-muted",
          inCompare &&
            "bg-muted-foreground text-primary-foreground hover:bg-muted-foreground/90",
          className,
        )}
        onClick={toggleCompare}
      >
        <ArrowLeftRight size={16} />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={inCompare ? "secondary" : "outline"}
      className={cn("flex items-center gap-2 w-full rounded-full", className)}
      onClick={toggleCompare}
    >
      <ArrowLeftRight className="h-4 w-4" />
      {inCompare ? "Remove from Compare" : "Add to Compare"}
    </Button>
  );
}
