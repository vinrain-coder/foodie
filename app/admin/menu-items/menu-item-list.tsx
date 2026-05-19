"use client";

import Link from "next/link";
import DeleteDialog from "@/components/shared/delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteMenuItem } from "@/lib/actions/menu.item.actions";
import { cn, formatDateTime, formatId } from "@/lib/utils";
import { EyeIcon, PenBox } from "lucide-react";
import Image from "next/image";
import Pagination from "@/components/shared/pagination";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import Price from "@/components/shared/menuItem/price";

type MenuItemListDataProps = {
  menuItems: IMenuItem[];
  totalPages: number;
  totalMenuItems: number;
  to: number;
  from: number;
};

interface MenuItemListProps {
  data: MenuItemListDataProps;
  page: number;
}

const MenuItemList = ({ data, page }: MenuItemListProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.totalMenuItems === 0
            ? "No menu items found"
            : `Showing ${data.from}-${data.to} of ${data.totalMenuItems} menu items`}
        </p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Id</TableHead>
              <TableHead className="w-20">Image</TableHead>
              <TableHead className="w-60">Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.menuItems.length > 0 ? (
              data.menuItems.map((menuItem: IMenuItem) => (
                <TableRow key={menuItem._id.toString()}>
                  <TableCell className="font-mono text-xs">
                    {formatId(menuItem._id.toString())}
                  </TableCell>
                  <TableCell>
                    {menuItem.images?.length > 0 ? (
                      <div className="relative aspect-square w-12 overflow-hidden rounded-md border">
                        <Image
                          src={menuItem.images[0]}
                          alt={menuItem.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-60 truncate font-medium">
                    <Link
                      href={`/admin/menu-items/${menuItem._id}`}
                      className="hover:underline"
                    >
                      {menuItem.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Price price={menuItem.price} plain />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {menuItem.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-medium",
                        menuItem.countInStock <= 0
                          ? "text-rose-600"
                          : menuItem.countInStock <= 10
                            ? "text-orange-600"
                            : "",
                      )}
                    >
                      {menuItem.countInStock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{menuItem.avgRating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({menuItem.numReviews})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {menuItem.isPublished ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(menuItem.updatedAt).dateTime}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm" title="Edit">
                        <Link href={`/admin/menu-items/${menuItem._id}`}>
                          <PenBox className="size-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" title="View">
                        <Link
                          target="_blank"
                          href={`/menu-item/${menuItem.slug}`}
                        >
                          <EyeIcon className="size-4" />
                        </Link>
                      </Button>
                      <DeleteDialog
                        id={menuItem._id.toString()}
                        action={deleteMenuItem}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  No menu items found matching the criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.totalPages > 1 && (
        <div className="mt-4">
          <Pagination page={page.toString()} totalPages={data.totalPages} />
        </div>
      )}
    </div>
  );
};

export default MenuItemList;
