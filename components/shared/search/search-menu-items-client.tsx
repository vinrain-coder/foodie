"use client";

import { useTransition } from "react";
import MenuItemLayoutSwitcher from "@/components/shared/menuItem/menu-item-layout-switcher";
import useMenuItemLayoutStore from "@/hooks/use-menu-item-layout-store";
import MenuItemLoadingOverlay from "../menuItem/menu-item-loading-overlay";

export default function SearchMenuItemsClient({
  menuItems,
}: {
  menuItems: any[];
}) {
  const { layout } = useMenuItemLayoutStore();
  const [isPending] = useTransition(); // optional fallback

  return (
    <div className="md:col-span-4 space-y-4 relative">
      {/* Loading overlay ONLY over menuItems */}
      {isPending && (
        <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm">
          <MenuItemLoadingOverlay layout={layout} />
        </div>
      )}

      <MenuItemLayoutSwitcher menuItems={menuItems} />
    </div>
  );
}
