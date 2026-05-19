"use client";

import { memo } from "react";
import { Grid2X2, RectangleHorizontal } from "lucide-react";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MenuItemCard from "./menu-item-card";
import useMenuItemLayoutStore from "@/hooks/use-menu-item-layout-store";

function MenuItemLayoutSwitcher({
  menuItems = [],
}: {
  menuItems?: IMenuItem[];
}) {
  const { layout, setLayout } = useMenuItemLayoutStore();

  const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];

  return (
    <div className="space-y-4">
      {/* Layout Toggle */}
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-full border bg-muted/40 p-1 shadow-sm">
          <Button
            type="button"
            size="sm"
            variant={layout === "classic" ? "default" : "ghost"}
            className={cn(
              "rounded-full px-3.5 text-xs sm:text-sm",
              layout !== "classic" && "text-muted-foreground",
            )}
            onClick={() => setLayout("classic")}
          >
            <Grid2X2 className="size-4" />
            Classic
          </Button>

          <Button
            type="button"
            size="sm"
            variant={layout === "detailed" ? "default" : "ghost"}
            className={cn(
              "rounded-full px-3.5 text-xs sm:text-sm",
              layout !== "detailed" && "text-muted-foreground",
            )}
            onClick={() => setLayout("detailed")}
          >
            <RectangleHorizontal className="size-4" />
            Detailed
          </Button>
        </div>
      </div>

      {/* MenuItem Grid */}
      <div
        className={cn(
          "grid gap-3 md:gap-4",
          layout === "classic"
            ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-max"
            : "grid-cols-1",
        )}
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 640px" }}
      >
        {safeMenuItems.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-10">
            No menu items found
          </div>
        ) : (
          safeMenuItems.map((p) => (
            <MenuItemCard
              key={p._id?.toString?.() ?? p._id}
              menuItem={p}
              layout={layout}
            />
          ))
        )}
      </div>
    </div>
  );
}

const MemoizedMenuItemLayoutSwitcher = memo(MenuItemLayoutSwitcher);
MemoizedMenuItemLayoutSwitcher.displayName = "MenuItemLayoutSwitcher";

export default MemoizedMenuItemLayoutSwitcher;
