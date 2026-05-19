import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IMenuItem } from "@/lib/db/models/menu.item.model";

const MAX_COMPARE_ITEMS = 4;

interface CompareState {
  menuItems: IMenuItem[];
  ids: string[];
  count: number;
  maxItems: number;
  addMenuItem: (menuItem: IMenuItem) => {
    added: boolean;
    reason?: "duplicate" | "max";
  };
  removeMenuItem: (menuItemId: string) => void;
  clearMenuItems: () => void;
  isInCompare: (menuItemId: string) => boolean;
}

export const useCompareStore = create(
  persist<CompareState>(
    (set, get) => ({
      menuItems: [],
      ids: [],
      count: 0,
      maxItems: MAX_COMPARE_ITEMS,

      addMenuItem: (menuItem) => {
        const id = menuItem._id.toString();
        const state = get();

        if (state.ids.includes(id)) {
          return { added: false, reason: "duplicate" as const };
        }

        if (state.ids.length >= MAX_COMPARE_ITEMS) {
          return { added: false, reason: "max" as const };
        }

        const updatedMenuItems = [...state.menuItems, menuItem];

        set({
          menuItems: updatedMenuItems,
          ids: [...state.ids, id],
          count: updatedMenuItems.length,
        });

        return { added: true };
      },

      removeMenuItem: (menuItemId) => {
        set((state) => {
          const updatedMenuItems = state.menuItems.filter(
            (menuItem) => menuItem._id.toString() !== menuItemId,
          );

          return {
            menuItems: updatedMenuItems,
            ids: updatedMenuItems.map((menuItem) => menuItem._id.toString()),
            count: updatedMenuItems.length,
          };
        });
      },

      clearMenuItems: () => set({ menuItems: [], ids: [], count: 0 }),

      isInCompare: (menuItemId) => get().ids.includes(menuItemId),
    }),
    {
      name: "compare-store",
    },
  ),
);
