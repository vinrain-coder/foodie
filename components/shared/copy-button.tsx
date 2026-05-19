"use client";

import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);
      toast.success("Copied to clipboard");

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      className={`
        flex items-center gap-2 px-3 h-9 rounded-xl border transition-all duration-200
        hover:scale-[1.02] active:scale-95
        ${
          copied
            ? "border-green-500 bg-green-50 text-green-700"
            : "border-border bg-background"
        }
      `}
    >
      <span className="flex items-center justify-center">
        {copied ? (
          <CheckIcon className="h-4 w-4 text-green-600" />
        ) : (
          <CopyIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </span>

      <span className="text-sm font-medium">{copied ? "Copied!" : "Copy"}</span>
    </Button>
  );
}
