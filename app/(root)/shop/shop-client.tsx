"use client";

import MenuItemLayoutSwitcher from "@/components/shared/menuItem/menu-item-layout-switcher";
import { IMenuItem } from "@/lib/db/models/menu.item.model";

export default function ShopClient({ menuItems }: { menuItems: IMenuItem[] }) {
  return <MenuItemLayoutSwitcher menuItems={menuItems} />;
}
