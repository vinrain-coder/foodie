"use client";

import { useState } from "react";
import { ArrowDown } from "lucide-react";

import {
  getOrderPdfDownloadUrl,
  getOrderPdfFileName,
} from "@/lib/pdf/receipt/download";
import { LoadingButton } from "../loading-button";

type OrderPdfDownloadLinksProps = {
  orderId: string;
  className?: string;
};

export function OrderPdfDownloadLinks({
  orderId,
  className,
}: OrderPdfDownloadLinksProps) {
  const [loadingType, setLoadingType] = useState<"receipt" | "invoice" | null>(
    null,
  );

  const handleDownload = async (type: "receipt" | "invoice") => {
    try {
      setLoadingType(type);

      const url = getOrderPdfDownloadUrl(orderId, type);
      const fileName = getOrderPdfFileName(orderId, type);

      const res = await fetch(url);
      const blob = await res.blob();

      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <LoadingButton
          variant="outline"
          className="w-full"
          loading={loadingType === "receipt"}
          loadingText="Loading..."
          onClick={() => handleDownload("receipt")}
        >
          Receipt PDF <ArrowDown size={16} />
        </LoadingButton>

        <LoadingButton
          variant="outline"
          className="w-full"
          loading={loadingType === "invoice"}
          loadingText="Loading..."
          onClick={() => handleDownload("invoice")}
        >
          Invoice PDF <ArrowDown size={16} />
        </LoadingButton>
      </div>
    </div>
  );
}
