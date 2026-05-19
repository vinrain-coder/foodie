import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { SerializedOrder } from "@/lib/actions/order.actions";
import { createElement } from "react";
import type { ReactElement } from "react";
import { ReceiptPdfDocument } from "./document";
import {
  mapSerializedOrderToReceiptDocument,
  toInvoiceNumber,
} from "./formatters";
import type {
  BuildReceiptPdfOptions,
  ReceiptDocumentData,
  ReceiptDocumentKind,
  ReceiptExportMeta,
} from "./types";

const sanitizeOrderId = (orderId: string) =>
  orderId.replace(/[^a-zA-Z0-9-_]/g, "");

export const buildReceiptFileName = (
  kind: ReceiptDocumentKind,
  orderId: string,
  prefix = "shoepedi",
) => {
  const safeOrderId = sanitizeOrderId(orderId);
  return `${prefix}-${kind}-${safeOrderId}.pdf`;
};

export const getReceiptExportMeta = (
  kind: ReceiptDocumentKind,
  orderId: string,
  prefix = "shoepedi",
): ReceiptExportMeta => ({
  fileName: buildReceiptFileName(kind, orderId, prefix),
  mimeType: "application/pdf",
  kind,
});

export const renderReceiptPdfBuffer = async (
  documentData: ReceiptDocumentData,
  options?: BuildReceiptPdfOptions,
) => {
  const doc = createElement(ReceiptPdfDocument, {
    data: documentData,
    options,
  }) as unknown as ReactElement<DocumentProps>;

  return renderToBuffer(doc);
};

export const buildOrderPdf = async (
  order: SerializedOrder,
  options?: BuildReceiptPdfOptions,
) => {
  const kind = options?.documentKind || "receipt";
  const mapped = mapSerializedOrderToReceiptDocument({
    order,
    kind,
    baseUrl: options?.baseUrl,
    locale: options?.locale,
    currency: options?.currency,
  });

  // Strengthen invoice identity; receipts and invoices can still share route.
  if (kind === "invoice") {
    mapped.invoiceNumber = toInvoiceNumber(order._id.toString());
  }

  const buffer = await renderReceiptPdfBuffer(mapped, options);
  const meta = getReceiptExportMeta(
    kind,
    mapped.orderId,
    options?.filenamePrefix || "shoepedi",
  );

  return { buffer, meta, data: mapped };
};
