import type { ReceiptDocumentKind } from "./types";

export const getOrderPdfDownloadUrl = (
  orderId: string,
  kind: ReceiptDocumentKind = "receipt",
) => `/api/orders/${encodeURIComponent(orderId)}/receipt?type=${kind}`;

export const getOrderPdfFileName = (
  orderId: string,
  kind: ReceiptDocumentKind = "receipt",
) => `tumafood-${kind}-${orderId}.pdf`;

