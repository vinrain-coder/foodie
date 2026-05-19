"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MenuItemCardLayout = "classic" | "detailed";

type MenuItemLayoutState = {
  layout: MenuItemCardLayout;
  setLayout: (layout: MenuItemCardLayout) => void;
};

const useMenuItemLayoutStore = create<MenuItemLayoutState>()(
  persist(
    (set) => ({
      layout: "classic",
      setLayout: (layout) => set({ layout }),
    }),
    {
      name: "menuItem-layout-preference",
    },
  ),
);

export default useMenuItemLayoutStore;
