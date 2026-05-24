import type { SerializedOrder } from "@/lib/actions/order.actions";

export type ReceiptDocumentKind = "receipt" | "invoice";
export type ReceiptPageSize = "A4" | "LETTER";
export type ReceiptThemeMode = "light" | "dark";

export type PaymentStatusTone =
  | "paid"
  | "pending"
  | "failed"
  | "partial"
  | "refunded";

export type DeliveryStatusTone =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";

export type CurrencyAmount = {
  value: number;
  currency?: string;
};

export type ReceiptAddress = {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postalCode?: string;
  country: string;
};

export type ReceiptCustomer = {
  fullName: string;
  email?: string;
  phone?: string;
  shippingAddress: ReceiptAddress;
  billingAddress?: ReceiptAddress;
};

export type ReceiptLineItem = {
  id: string;
  name: string;
  variant?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  imageUrl?: string;
};

export type ReceiptPricing = {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  couponCode?: string;
  couponAmount?: number;
  finalTotal?: number;
  currency?: string;
};

export type ReceiptPayment = {
  method: string;
  transactionId?: string;
  provider?: string;
  providerReference?: string;
  status: PaymentStatusTone;
  confirmedAt?: Date | string;
  channel?: string;
};

export type BrandSocial = {
  label: string;
  value: string;
};

export type ReceiptBranding = {
  brandName: string;
  slogan?: string;
  website: string;
  supportEmail: string;
  supportPhone?: string;
  supportAddress?: string;
  logoUrl?: string;
  watermarkLogoUrl?: string;
  socials?: BrandSocial[];
  accentText?: string;
  legalLine?: string;
};

export type ReceiptDocumentData = {
  kind: ReceiptDocumentKind;
  orderId: string;
  invoiceNumber: string;
  orderDate: Date | string;
  deliveryStatus: DeliveryStatusTone;
  paymentStatus: PaymentStatusTone;
  customer: ReceiptCustomer;
  items: ReceiptLineItem[];
  pricing: ReceiptPricing;
  payment: ReceiptPayment;
  note?: string;
  returnPolicy?: string;
  thankYouMessage?: string;
  qrCodeUrl?: string;
  barcodeUrl?: string;
  currency?: string;
  locale?: string;
};

export type ReceiptRenderOptions = {
  pageSize?: ReceiptPageSize;
  themeMode?: ReceiptThemeMode;
  locale?: string;
  currency?: string;
  branding?: Partial<ReceiptBranding>;
  includeBarcode?: boolean;
  includeQrCode?: boolean;
  now?: Date;
};

export type BuildReceiptPdfOptions = ReceiptRenderOptions & {
  documentKind?: ReceiptDocumentKind;
  filenamePrefix?: string;
  baseUrl?: string;
};

export type ReceiptExportMeta = {
  fileName: string;
  mimeType: "application/pdf";
  kind: ReceiptDocumentKind;
};

export type ReceiptOrderMapperInput = {
  order: SerializedOrder;
  kind: ReceiptDocumentKind;
  baseUrl?: string;
  locale?: string;
  currency?: string;
};
