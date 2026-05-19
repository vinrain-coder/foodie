import { create } from "zustand";
import { IMenuItem } from "@/lib/db/models/menu.item.model";

export interface WishlistState {
  menuItems: IMenuItem[];
  ids: string[];
  count: number;

  setMenuItems: (menuItems: IMenuItem[]) => void;
  addMenuItem: (menuItem: IMenuItem) => void;
  addMenuItemById: (menuItemId: string) => void;
  removeMenuItem: (menuItemId: string) => void;
  isInWishlist: (menuItemId: string) => boolean;
  setCount: (count: number) => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  menuItems: [],
  ids: [],
  count: 0,

  setMenuItems: (menuItems) => {
    const unique = [
      ...new Map(menuItems.map((p) => [p._id.toString(), p])).values(),
    ];
    set({
      menuItems: unique,
      ids: unique.map((p) => p._id.toString()),
      count: unique.length,
    });
  },

  addMenuItem: (menuItem) => {
    const id = menuItem._id.toString();
    if (get().ids.includes(id)) return;
    set((state) => {
      const updated = [...state.menuItems, menuItem];
      return {
        menuItems: updated,
        ids: [...state.ids, id],
        count: updated.length,
      };
    });
  },

  addMenuItemById: (menuItemId) => {
    if (get().ids.includes(menuItemId)) return;
    set((state) => ({
      ids: [...state.ids, menuItemId],
      count: state.count + 1,
    }));
  },

  removeMenuItem: (menuItemId) => {
    set((state) => {
      const updatedMenuItems = state.menuItems.filter(
        (p) => p._id.toString() !== menuItemId,
      );
      const updatedIds = state.ids.filter((id) => id !== menuItemId);
      return {
        menuItems: updatedMenuItems,
        ids: updatedIds,
        count: updatedIds.length,
      };
    });
  },

  isInWishlist: (menuItemId) => get().ids.includes(menuItemId),

  setCount: (count) => set({ count }),
}));
