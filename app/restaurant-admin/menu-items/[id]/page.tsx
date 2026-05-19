import { notFound } from "next/navigation";

import { getMenuItemById } from "@/lib/actions/menu.item.actions";
import Link from "next/link";
import MenuItemForm from "../menu-item-form";
import { Metadata } from "next";
import { getAllCategoriesForAdminMenuItemInput } from "@/lib/actions/category.actions";

export const metadata: Metadata = {
  title: "Edit MenuItem",
};

type UpdateMenuItemProps = {
  params: Promise<{
    id: string;
  }>;
};

const UpdateMenuItem = async (props: UpdateMenuItemProps) => {
  const params = await props.params;

  const { id } = params;

  const menuItem = await getMenuItemById(id);
  if (!menuItem) notFound();

  const categories = await getAllCategoriesForAdminMenuItemInput();
  const categoryOptions = categories.map((category) => ({
    _id: String(category._id),
    name: category.name,
  }));

  return (
    <main className="max-w-6xl mx-auto p-4">
      <div className="flex mb-4">
        <Link href="/restaurant-admin/menu-items">MenuItems</Link>
        <span className="mx-1">›</span>
        <Link href={`/restaurant-admin/menu-items/${menuItem._id}`}>
          {menuItem._id.toString()}
        </Link>
      </div>

      <div className="my-8">
        <MenuItemForm
          type="Update"
          menuItem={menuItem}
          menuItemId={menuItem._id.toString()}
          categories={categoryOptions}
        />
      </div>
    </main>
  );
};

export default UpdateMenuItem;
