"use client";

import {
  ChevronRight,
  House,
  Menu as MenuIcon,
  MoonStar,
  Navigation,
} from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CartButton from "./cart-button";
import UserButton from "./user-button";
import ThemeSwitcher from "./theme-switcher";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { SignOutButton } from "../sign-out-button";

const Menu = ({ forAdmin = false }: { forAdmin?: boolean }) => {
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <nav className="hidden w-full items-center gap-1 md:flex">
        <ThemeSwitcher />
        <UserButton />
        {!forAdmin && <CartButton />}
      </nav>

      <nav className="flex items-center gap-1 md:hidden">
        {!forAdmin && <CartButton />}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="header-icon-button align-middle"
            aria-label="Open site menu"
          >
            <MenuIcon className="h-5 w-5" />
          </SheetTrigger>

          <SheetContent className="flex flex-col gap-4 overflow-y-auto px-3">
            <SheetHeader className="w-full border-b pb-3 text-left">
              <SheetTitle className="ml-1 flex items-center gap-2">
                <House className="h-4 w-4" /> Site Menu
              </SheetTitle>
              <SheetDescription className="text-xs">
                Quick access to navigation, account, and appearance settings.
              </SheetDescription>
            </SheetHeader>

            <Accordion
              type="multiple"
              defaultValue={["navigation", "account", "appearance"]}
              className="w-full"
            >
              <AccordionItem value="appearance">
                <AccordionTrigger className="py-3 text-sm">
                  <span className="flex items-center gap-2 font-semibold">
                    <MoonStar className="h-4 w-4" /> Theme toggle
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ThemeSwitcher className="ml-0 w-full justify-start" />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="navigation">
                <AccordionTrigger className="py-3 text-sm">
                  <span className="flex items-center gap-2 font-semibold">
                    <Navigation className="h-4 w-4" /> Navigation links
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1">
                    {[
                      { href: "/", label: "Home" },
                      { href: "/search", label: "Shop all menu items" },
                      { href: "/categories", label: "Categories" },
                      { href: "/compare", label: "Compare menu items" },
                      { href: "/blogs", label: "Blogs" },
                      { href: "/track", label: "Track order" },
                      { href: "/support", label: "Support" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch
                        onClick={() => setOpen(false)}
                        className="item-button"
                      >
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="account">
                <AccordionTrigger className="py-3 text-sm">
                  <span className="font-semibold">Account links</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1">
                    {session ? (
                      <>
                        {[
                          { href: "/account", label: "Your account" },
                          { href: "/account/orders", label: "Orders" },
                          { href: "/account/wishlist", label: "Wishlist" },
                          { href: "/coupons", label: "Coupons" },
                          { href: "/compare", label: "Compare" },
                          {
                            href: "/browsing-history",
                            label: "Browsing History",
                          },
                          { href: "/account/wallet", label: "My wallet" },
                          { href: "/account/comments", label: "My comments" },
                        ].map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            onClick={() => setOpen(false)}
                            className="item-button"
                          >
                            <span>{item.label}</span>
                          </Link>
                        ))}
                        <div className="pt-3">
                          <SignOutButton />
                        </div>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/coupons"
                          onClick={() => setOpen(false)}
                          className="item-button"
                        >
                          <span>Free Coupons</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        <Link
                          href="/sign-in"
                          onClick={() => setOpen(false)}
                          className="item-button"
                        >
                          <span>Sign in</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        <Link
                          href="/sign-up"
                          onClick={() => setOpen(false)}
                          className="item-button"
                        >
                          <span>Create account</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};

export default Menu;
