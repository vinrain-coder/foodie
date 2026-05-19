import { formatDateTime, round2 } from "@/lib/utils";
import type {
  CurrencyAmount,
  ReceiptAddress,
  ReceiptDocumentData,
  ReceiptOrderMapperInput,
  PaymentStatusTone,
  DeliveryStatusTone,
} from "./types";

const DEFAULT_LOCALE = "en-KE";
const DEFAULT_CURRENCY = "KES";

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const normalizeMoney = (value: number) => round2(Number(value) || 0);

export const formatMoney = (
  amount: CurrencyAmount,
  locale = DEFAULT_LOCALE,
  fallbackCurrency = DEFAULT_CURRENCY,
) => {
  const safeCurrency = amount.currency || fallbackCurrency;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount.value) || 0);
};

export const formatDocumentDate = (
  value: Date | string | number | undefined,
  locale = DEFAULT_LOCALE,
) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const toAddressLines = (address?: ReceiptAddress) => {
  if (!address) return ["-"];
  const cityLine = [address.city, address.province, address.postalCode]
    .filter(Boolean)
    .join(", ");

  return [address.line1, address.line2, cityLine, address.country].filter(
    Boolean,
  ) as string[];
};

const toPaymentStatusTone = (
  input: string | undefined,
  isPaid: boolean,
): PaymentStatusTone => {
  const value = (input || "").toLowerCase();
  if (isPaid || value === "success" || value === "paid") return "paid";
  if (value === "refunded") return "refunded";
  if (value === "partial") return "partial";
  if (value === "failed") return "failed";
  return "pending";
};

const toDeliveryStatusTone = (
  input: string | undefined,
  isDelivered: boolean,
): DeliveryStatusTone => {
  if (isDelivered) return "delivered";

  const value = (input || "").toLowerCase();
  if (value === "processing") return "processing";
  if (value === "shipped" || value === "out_for_delivery") return "shipped";
  if (value === "returned" || value === "return_requested") return "returned";
  if (value === "cancelled") return "cancelled";
  return "pending";
};

const toAbsoluteUrl = (value: string | undefined, baseUrl?: string) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }
  if (!baseUrl) return undefined;
  return `${baseUrl.replace(/\/+$/, "")}/${value.replace(/^\/+/, "")}`;
};

export const toInvoiceNumber = (orderId: string) =>
  `INV-${orderId.slice(-8).toUpperCase()}`;

export const mapSerializedOrderToReceiptDocument = ({
  order,
  kind,
  baseUrl,
  locale = DEFAULT_LOCALE,
  currency = DEFAULT_CURRENCY,
}: ReceiptOrderMapperInput): ReceiptDocumentData => {
  const paymentResult = asRecord(order.paymentResult);
  const authorization = asRecord(paymentResult?.authorization);

  const shippingAddress = {
    line1: order.shippingAddress.street,
    city: order.shippingAddress.city,
    province: order.shippingAddress.province,
    postalCode: order.shippingAddress.postalCode,
    country: order.shippingAddress.country,
  };

  const subtotal = normalizeMoney(order.itemsPrice);
  const shipping = normalizeMoney(order.shippingPrice);
  const tax = normalizeMoney(order.taxPrice);
  const discount = normalizeMoney(order.coupon?.discountAmount || 0);
  const computedFinalTotal = normalizeMoney(
    subtotal + shipping + tax - discount,
  );

  const items = order.items.map((item, index) => ({
    id: `${item.clientId || item.slug || index}`,
    name: item.name,
    variant: [item.size ? `Size ${item.size}` : null, item.color || null]
      .filter(Boolean)
      .join(" / "),
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    unitPrice: normalizeMoney(item.price),
    total: normalizeMoney(item.price * item.quantity),
    imageUrl: toAbsoluteUrl(item.image, baseUrl),
  }));

  const data: ReceiptDocumentData = {
    kind,
    orderId: order._id.toString(),
    invoiceNumber: toInvoiceNumber(order._id.toString()),
    orderDate: order.createdAt,
    paymentStatus: toPaymentStatusTone(
      typeof paymentResult?.status === "string"
        ? paymentResult.status
        : undefined,
      order.isPaid,
    ),
    deliveryStatus: toDeliveryStatusTone(order.status, order.isDelivered),
    customer: {
      fullName: order.shippingAddress.fullName,
      email:
        order.shippingAddress.email ||
        order.userEmail ||
        (typeof paymentResult?.email_address === "string"
          ? paymentResult.email_address
          : undefined),
      phone: order.shippingAddress.phone,
      shippingAddress,
      billingAddress: shippingAddress,
    },
    items,
    pricing: {
      subtotal,
      shipping,
      tax,
      discount,
      couponCode: order.coupon?.code,
      couponAmount: discount || undefined,
      finalTotal: normalizeMoney(order.totalPrice || computedFinalTotal),
      currency:
        typeof paymentResult?.currency === "string"
          ? paymentResult.currency
          : currency,
    },
    payment: {
      method: order.paymentMethod || "Payment",
      transactionId:
        typeof paymentResult?.id === "string" ? paymentResult.id : undefined,
      provider:
        typeof paymentResult?.gateway === "string"
          ? paymentResult.gateway
          : "Paystack",
      providerReference:
        typeof paymentResult?.paymentReference === "string"
          ? paymentResult.paymentReference
          : undefined,
      status: toPaymentStatusTone(
        typeof paymentResult?.status === "string"
          ? paymentResult.status
          : undefined,
        order.isPaid,
      ),
      confirmedAt:
        (typeof paymentResult?.paidAtGateway === "string"
          ? paymentResult.paidAtGateway
          : undefined) || order.paidAt,
      channel:
        typeof paymentResult?.channel === "string"
          ? paymentResult.channel
          : undefined,
    },
    note: order.note,
    returnPolicy:
      "Returns accepted within 14 days of delivery for unused items in original packaging.",
    thankYouMessage:
      "Thank you for shopping with ShoePedi. We appreciate your trust.",
    qrCodeUrl: undefined,
    barcodeUrl: undefined,
    locale,
    currency,
  };

  if (
    !data.payment.providerReference &&
    typeof authorization?.last4 === "string"
  ) {
    data.payment.providerReference = `Card •••• ${authorization.last4}`;
  }

  return data;
};

export const statusLabel = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export const fallbackDateTime = (dateInput: Date | string | undefined) => {
  if (!dateInput) return "-";
  return formatDateTime(dateInput).dateTime;
};
