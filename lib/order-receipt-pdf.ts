import type { SerializedOrder } from "@/lib/actions/order.actions";
import {
  buildOrderPdf,
  buildReceiptFileName,
} from "@/lib/pdf/receipt/generator";
import type {
  BuildReceiptPdfOptions,
  ReceiptDocumentKind,
} from "@/lib/pdf/receipt/types";

export async function buildOrderReceiptPdf(
  order: SerializedOrder,
  options?: Omit<BuildReceiptPdfOptions, "documentKind">,
): Promise<Buffer> {
  const { buffer } = await buildOrderPdf(order, {
    ...options,
    documentKind: "receipt",
  });

  return buffer;
}

export async function buildOrderInvoicePdf(
  order: SerializedOrder,
  options?: Omit<BuildReceiptPdfOptions, "documentKind">,
): Promise<Buffer> {
  const { buffer } = await buildOrderPdf(order, {
    ...options,
    documentKind: "invoice",
  });

  return buffer;
}

export const getOrderPdfFileName = (
  orderId: string,
  kind: ReceiptDocumentKind = "receipt",
) => buildReceiptFileName(kind, orderId, "shoepedi");
