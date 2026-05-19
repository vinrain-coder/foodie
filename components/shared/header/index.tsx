import Image from "next/image";
import Link from "next/link";
import { getAllCategories } from "@/lib/actions/menu.item.actions";
import Menu from "./menu";
import Search from "./search";
import Sidebar from "./sidebar";
import { getSetting } from "@/lib/actions/setting.actions";
import NavbarWishlist from "./nav-wishlist";
import NavbarCompare from "./nav-compare";
import HeaderMenuBar from "./header-menu-bar";
import HeaderMenuStrip from "./header-menu-strip";
import MobileSearchToggle from "./mobile-search-toggle";

export default async function Header() {
  const categories = await getAllCategories();
  const { site, headerMenus } = await getSetting();

  return (
    <header className="header-shell sticky top-0 z-40">
      <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-3">
        <div className="flex min-h-14 items-center gap-1 py-0.5 sm:min-h-18 sm:gap-2 sm:py-1.5">
          <Link
            href="/"
            className="group inline-flex min-w-0 items-center gap-1 rounded-xl px-1 py-1 transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2.5 sm:px-2 sm:py-1.5"
          >
            <Image
              src={site.logo}
              width={52}
              height={52}
              alt={`${site.name} logo`}
              priority
              className="h-11 w-11 shrink-0 rounded-lg object-contain sm:h-11 sm:w-11 lg:h-12 lg:w-12"
            />

            <div className="min-w-0 leading-none">
              <p className="max-w-34 hidden sm:block truncate text-[1.4rem] font-black tracking-tight text-foreground sm:max-w-30 sm:text-[1.15rem] lg:text-[1.28rem]">
                {site.name}
              </p>

              <p className="mt-0.5 hidden truncate text-[10px] font-medium tracking-tight text-muted-foreground sm:block sm:text-[11px]">
                {site.slogan}
              </p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 px-1 md:block">
            <Search categories={categories} siteName={site.name} />
          </div>

          <div className="ml-auto flex items-center gap-0 sm:gap-1.5">
            <MobileSearchToggle categories={categories} siteName={site.name} />
            <NavbarCompare />
            <NavbarWishlist />
            <Menu />
          </div>
        </div>

        <HeaderMenuStrip>
          <div className="flex items-center gap-2 rounded-xl bg-card px-2 py-1.5 -mt-2">
            <Sidebar categories={categories} />
            <HeaderMenuBar headerMenus={headerMenus} />
          </div>
        </HeaderMenuStrip>
      </div>
    </header>
  );
}
