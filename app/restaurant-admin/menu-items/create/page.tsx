import Link from "next/link";
import { Metadata } from "next";
import MenuItemForm from "../menu-item-form";
import { getAllCategoriesForAdminMenuItemInput } from "@/lib/actions/category.actions";
import { getRestaurantsForMenuItemInput } from "@/lib/actions/menu.item.actions";

export const metadata: Metadata = {
  title: "Create MenuItem",
};

const CreateMenuItemPage = async () => {
  const [categories, restaurants] = await Promise.all([
    getAllCategoriesForAdminMenuItemInput(),
    getRestaurantsForMenuItemInput(),
  ]);
  return (
    <main className="max-w-6xl mx-auto p-4">
      <div className="flex mb-4">
        <Link href="/restaurant-admin/menu-items">MenuItems</Link>
        <span className="mx-1">›</span>
        <Link href="/restaurant-admin/menu-items/create">Create</Link>
      </div>

      <div className="my-8">
        <MenuItemForm
          type="Create"
          categories={categories as any}
          restaurants={restaurants}
        />
      </div>
    </main>
  );
};

export default CreateMenuItemPage;

