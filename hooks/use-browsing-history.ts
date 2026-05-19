import { create } from "zustand";
import { persist } from "zustand/middleware";
type BrowsingHistory = {
  menuItems: { id: string; category: string }[];
};
const initialState: BrowsingHistory = {
  menuItems: [],
};

export const browsingHistoryStore = create<BrowsingHistory>()(
  persist(() => initialState, {
    name: "browsingHistoryStore",
  })
);

export default function useBrowsingHistory() {
  const { menuItems } = browsingHistoryStore();
  return {
    menuItems,
    addItem: (menuItem: { id: string; category: string }) => {
      const index = menuItems.findIndex((p) => p.id === menuItem.id);
      if (index !== -1) menuItems.splice(index, 1); // Remove duplicate if it exists
      menuItems.unshift(menuItem); // Add id to the start

      if (menuItems.length > 100) menuItems.pop(); // Remove excess items if length exceeds 100

      browsingHistoryStore.setState({
        menuItems,
      });
    },

    removeItem: (id: string) => {
      const newMenuItems = menuItems.filter((p) => p.id !== id);
      browsingHistoryStore.setState({
        menuItems: newMenuItems,
      });
    },

    clear: () => {
      browsingHistoryStore.setState({
        menuItems: [],
      });
    },
  };
}
