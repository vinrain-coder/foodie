"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type ResponsiveModalRenderProps = {
  close: () => void;
};

type ResponsiveModalProps = {
  title: string;
  description?: string;
  trigger: () => React.ReactElement;
  children: (props: ResponsiveModalRenderProps) => React.ReactNode;
  dialogContentClassName?: string;
  drawerContentClassName?: string;
  drawerBodyClassName?: string;
};

export function ResponsiveModal({
  title,
  description,
  trigger,
  children,
  dialogContentClassName,
  drawerContentClassName,
  drawerBodyClassName,
}: ResponsiveModalProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="hidden md:block">
          <DialogTrigger asChild>{trigger()}</DialogTrigger>
        </div>
        <DialogContent
          className={cn(
            "flex max-h-[min(720px,calc(100vh-2rem))] flex-col overflow-hidden p-0 sm:max-w-2xl",
            dialogContentClassName,
          )}
        >
          <DialogHeader className="shrink-0 border-b bg-muted/30 px-6 py-5">
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6">
            {children({ close: () => setDialogOpen(false) })}
          </div>
        </DialogContent>
      </Dialog>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="md:hidden">
          <DrawerTrigger asChild>{trigger()}</DrawerTrigger>
        </div>
        <DrawerContent
          className={cn(
            "max-h-[92vh] rounded-t-3xl p-0",
            drawerContentClassName,
          )}
        >
          <DrawerHeader className="shrink-0 border-b px-5 pb-4 pt-5 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
          <div
            className={cn(
              "min-h-0 overflow-y-auto px-5 pb-6 overscroll-contain",
              drawerBodyClassName,
            )}
          >
            {children({ close: () => setDrawerOpen(false) })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
