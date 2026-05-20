import ThemeSwitcher from "@/components/shared/header/theme-switcher";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Image from "next/image";

export function SiteHeader({
  restaurantName,
  restaurantLogo,
}: {
  restaurantName: string;
  restaurantLogo: string;
}) {
  const nameInitial = restaurantName.trim().charAt(0).toUpperCase() || "R";

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 w-8! h-8!" />
        <div className="ml-2 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
            {restaurantLogo ? (
              <Image
                src={restaurantLogo}
                alt={`${restaurantName} logo`}
                width={36}
                height={36}
                unoptimized
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs font-semibold text-primary">
                {nameInitial}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{restaurantName}</p>
            <p className="mt-1 text-xs text-muted-foreground">Control Center</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm">
            <ThemeSwitcher />
          </Button>
        </div>
      </div>
    </header>
  );
}
