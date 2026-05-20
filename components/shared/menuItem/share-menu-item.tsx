"use client";

import { useState, useEffect } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import WhatsApp from "@/public/icons/whatsapp.svg";
import Image from "next/image";
import CopyButton from "../copy-button";

function ShareMenuItem({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const [menuItemUrl, setMenuItemUrl] = useState("");
  const [open, setOpen] = useState(false);
  const canUseNativeShare =
    typeof window !== "undefined" &&
    typeof (navigator as Navigator & { share?: Navigator["share"] }).share ===
      "function";

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMenuItemUrl(`${window.location.origin}/menu-item/${slug}`);
    }
  }, [slug]);

  const handleCopy = () => {
    if (!menuItemUrl) return;
    navigator.clipboard.writeText(menuItemUrl).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 2000);
    });
  };

  const shareOnMobile = () => {
    if (canUseNativeShare && menuItemUrl) {
      navigator.share({
        title: name,
        text: `Check out this menu item: ${name}`,
        url: menuItemUrl,
      });
    } else {
      handleCopy();
    }
  };

  const shareOnWhatsApp = () => {
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this menu item: ${name} ${menuItemUrl}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 hover:bg-accent transition-colors"
        >
          <Share2 className="size-4" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Share this menu item
          </p>

          <div className="flex gap-2">
            <CopyButton value={menuItemUrl} />

            <Button
              onClick={shareOnWhatsApp}
              size="sm"
              className="gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white h-9"
            >
              <Image src={WhatsApp} alt="WhatsApp" width={16} height={16} />
              WhatsApp
            </Button>
          </div>

          {canUseNativeShare && (
            <>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-popover px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              <Button
                onClick={shareOnMobile}
                variant="outline"
                size="sm"
                className="w-full gap-2 h-9"
              >
                <Share2 className="size-4" />
                More options
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ShareMenuItem;
