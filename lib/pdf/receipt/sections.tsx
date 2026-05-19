import {
  Image,
  Svg,
  Rect,
  Text,
  View,
  Circle,
  Path,
} from "@react-pdf/renderer";
import {
  formatDocumentDate,
  formatMoney,
  statusLabel,
  toAddressLines,
} from "./formatters";
import type {
  ReceiptBranding,
  ReceiptDocumentData,
  ReceiptThemeMode,
} from "./types";
import { createReceiptStyles } from "./styles";
import type { ReceiptThemeTokens } from "./styles";

type SectionProps = {
  data: ReceiptDocumentData;
  branding: ReceiptBranding;
  styles: ReturnType<typeof createReceiptStyles>;
  theme: ReceiptThemeTokens;
  themeMode: ReceiptThemeMode;
  locale: string;
  currency: string;
};

const statusBadgePalette = (
  status: string,
  theme: ReceiptThemeTokens,
): { backgroundColor: string; color: string } => {
  const normalized = status.toLowerCase();
  if (["paid", "delivered"].includes(normalized)) {
    return { backgroundColor: theme.successBg, color: theme.successText };
  }
  if (["cancelled", "failed", "returned", "refunded"].includes(normalized)) {
    return { backgroundColor: theme.dangerBg, color: theme.dangerText };
  }
  return { backgroundColor: theme.warningBg, color: theme.warningText };
};

const LogoMark = ({
  themeMode,
  size = 24,
}: {
  themeMode: ReceiptThemeMode;
  size?: number;
}) => {
  const stroke = themeMode === "dark" ? "#F2F5F7" : "#101418";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={1} y={1} width={22} height={22} rx={6} stroke={stroke} />
      <Circle cx={8.5} cy={8.5} r={2.1} fill={stroke} />
      <Path
        d="M6 16.2h12c-1.2-2.5-3.1-3.5-5.4-2.7l-2 0.7-1.4-1.6L6 16.2z"
        fill={stroke}
      />
    </Svg>
  );
};

const SafeImage = ({
  src,
  style,
  fallbackThemeMode,
}: {
  src?: string;
  style?: unknown;
  fallbackThemeMode: ReceiptThemeMode;
}) => {
  if (!src) {
    return (
      <View
        style={[
          style as never,
          {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              fallbackThemeMode === "dark" ? "#20252D" : "#EFF2F4",
          },
        ]}
      >
        <Text
          style={{
            fontSize: 8,
            color: fallbackThemeMode === "dark" ? "#BCC2C9" : "#5C636B",
          }}
        >
          NO IMAGE
        </Text>
      </View>
    );
  }

  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={src} style={style as never} />;
};

export const HeaderSection = ({
  data,
  branding,
  styles,
  theme,
  themeMode,
  locale,
}: SectionProps) => {
  const paymentPalette = statusBadgePalette(data.paymentStatus, theme);
  const deliveryPalette = statusBadgePalette(data.deliveryStatus, theme);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.grow,
            { flexDirection: "row", alignItems: "center", gap: 8 },
          ]}
        >
          {branding.logoUrl ? (
            <SafeImage
              src={branding.logoUrl}
              fallbackThemeMode={themeMode}
              style={{ width: 30, height: 30, borderRadius: 6 }}
            />
          ) : (
            <LogoMark themeMode={themeMode} size={30} />
          )}
          <View>
            <Text style={{ fontSize: 12, color: theme.accent }}>
              {branding.brandName}
            </Text>
            {branding.slogan || branding.accentText ? (
              <Text style={[styles.subtle, { marginTop: 2 }]}>
                {branding.slogan || branding.accentText}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <Text style={styles.title}>
            {data.kind === "invoice" ? "INVOICE" : "RECEIPT"}
          </Text>
          <Text style={styles.subtle}>{data.invoiceNumber}</Text>
          <Text style={[styles.subtle, { marginTop: 2 }]}>{branding.website}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={[styles.row, { gap: 12 }]}>
        <View style={styles.grow}>
          <Text style={styles.label}>Order ID</Text>
          <Text style={styles.body}>{data.orderId}</Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.label}>Order Date</Text>
          <Text style={styles.body}>
            {formatDocumentDate(data.orderDate, locale)}
          </Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.label}>Payment Status</Text>
          <Text style={[styles.badge, paymentPalette]}>
            {statusLabel(data.paymentStatus)}
          </Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.label}>Delivery Status</Text>
          <Text style={[styles.badge, deliveryPalette]}>
            {statusLabel(data.deliveryStatus)}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const CustomerSection = ({ data, styles }: SectionProps) => {
  const shippingLines = toAddressLines(data.customer.shippingAddress);
  const billingLines = toAddressLines(
    data.customer.billingAddress || data.customer.shippingAddress,
  );

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Customer</Text>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.body}>{data.customer.fullName}</Text>
          <Text style={[styles.label, { marginTop: 6 }]}>Email</Text>
          <Text style={styles.body}>{data.customer.email || "-"}</Text>
          <Text style={[styles.label, { marginTop: 6 }]}>Phone</Text>
          <Text style={styles.body}>{data.customer.phone || "-"}</Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.label}>Shipping Address</Text>
          {shippingLines.map((line) => (
            <Text key={`ship-${line}`} style={styles.body}>
              {line}
            </Text>
          ))}
        </View>
        <View style={styles.grow}>
          <Text style={styles.label}>Billing Address</Text>
          {billingLines.map((line) => (
            <Text key={`bill-${line}`} style={styles.body}>
              {line}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

export const MenuItemTableSection = ({
  data,
  styles,
  themeMode,
  locale,
  currency,
}: SectionProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Menu Items</Text>
      <View style={styles.tableHead}>
        <Text style={styles.tableColImage}>Item</Text>
        <Text style={styles.tableColMenuItem}>MenuItem</Text>
        <Text style={styles.tableColVariant}>Variant</Text>
        <Text style={styles.tableColQty}>Qty</Text>
        <Text style={styles.tableColUnit}>Unit</Text>
        <Text style={styles.tableColTotal}>Total</Text>
      </View>
      {data.items.length === 0 ? (
        <View style={{ paddingVertical: 14 }}>
          <Text style={styles.subtle}>No items found for this order.</Text>
        </View>
      ) : (
        data.items.map((item) => (
          <View key={item.id} style={styles.tableRow} wrap={false}>
            <View style={styles.tableColImage}>
              <View style={styles.thumbWrap}>
                <SafeImage
                  src={item.imageUrl}
                  style={styles.thumb}
                  fallbackThemeMode={themeMode}
                />
              </View>
            </View>
            <View style={styles.tableColMenuItem}>
              <Text style={styles.body}>{item.name}</Text>
            </View>
            <View style={styles.tableColVariant}>
              <Text style={styles.subtle}>{item.variant || "-"}</Text>
            </View>
            <Text style={styles.tableColQty}>{item.quantity}</Text>
            <Text style={styles.tableColUnit}>
              {formatMoney(
                { value: item.unitPrice, currency },
                locale,
                currency,
              )}
            </Text>
            <Text style={styles.tableColTotal}>
              {formatMoney(
                {
                  value: item.total ?? item.unitPrice * item.quantity,
                  currency,
                },
                locale,
                currency,
              )}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

export const PricingAndPaymentSection = ({
  data,
  styles,
  locale,
  currency,
}: SectionProps) => {
  const totalValue =
    data.pricing.finalTotal ??
    data.pricing.subtotal +
      data.pricing.shipping +
      data.pricing.tax -
      data.pricing.discount;

  const rows = [
    { label: "Subtotal", value: data.pricing.subtotal },
    { label: "Shipping", value: data.pricing.shipping },
    { label: "Tax / VAT", value: data.pricing.tax },
    { label: "Discount", value: -Math.abs(data.pricing.discount) },
  ];

  return (
    <View style={styles.row}>
      <View style={[styles.card, styles.grow]}>
        <Text style={styles.sectionTitle}>Pricing Summary</Text>
        {rows.map((row) => (
          <View key={row.label} style={[styles.row, { marginBottom: 8 }]}>
            <Text style={styles.subtle}>{row.label}</Text>
            <Text style={styles.body}>
              {formatMoney({ value: row.value, currency }, locale, currency)}
            </Text>
          </View>
        ))}
        <View style={[styles.row, { marginBottom: 8 }]}>
          <Text style={styles.subtle}>Coupon Applied</Text>
          <Text style={styles.body}>{data.pricing.couponCode || "-"}</Text>
        </View>
        <View style={[styles.divider, { marginVertical: 8 }]} />
        <View style={styles.row}>
          <Text style={styles.label}>Final Total</Text>
          <Text style={styles.priceTotal}>
            {formatMoney({ value: totalValue, currency }, locale, currency)}
          </Text>
        </View>
      </View>

      <View style={[styles.card, styles.grow]}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <Text style={styles.label}>Method</Text>
        <Text style={styles.body}>{data.payment.method || "-"}</Text>
        <Text style={[styles.label, { marginTop: 6 }]}>Transaction ID</Text>
        <Text style={styles.body}>{data.payment.transactionId || "-"}</Text>
        <Text style={[styles.label, { marginTop: 6 }]}>Provider</Text>
        <Text style={styles.body}>{data.payment.provider || "-"}</Text>
        <Text style={[styles.label, { marginTop: 6 }]}>Reference</Text>
        <Text style={styles.body}>{data.payment.providerReference || "-"}</Text>
        <Text style={[styles.label, { marginTop: 6 }]}>Confirmed</Text>
        <Text style={styles.body}>
          {data.payment.confirmedAt
            ? formatDocumentDate(data.payment.confirmedAt, locale)
            : "-"}
        </Text>
      </View>
    </View>
  );
};

export const FooterSection = ({
  data,
  branding,
  styles,
  themeMode,
  locale,
}: SectionProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.body}>
            {data.thankYouMessage || "Thank you for your purchase."}
          </Text>
          <Text style={[styles.subtle, { marginTop: 8 }]}>
            {data.returnPolicy ||
              "Return/refund requests are handled according to our support policy."}
          </Text>
          {data.note ? (
            <Text style={[styles.subtle, { marginTop: 8 }]}>{data.note}</Text>
          ) : null}
        </View>
        <View style={[styles.grow, { alignItems: "flex-end" }]}>
          {data.qrCodeUrl ? (
            <SafeImage
              src={data.qrCodeUrl}
              fallbackThemeMode={themeMode}
              style={{ width: 62, height: 62, borderRadius: 6 }}
            />
          ) : (
            <View
              style={{
                width: 62,
                height: 62,
                borderWidth: 1,
                borderColor: "#D3D8DE",
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 7, color: "#7A828C" }}>QR OPTIONAL</Text>
            </View>
          )}
          {data.barcodeUrl ? (
            <SafeImage
              src={data.barcodeUrl}
              fallbackThemeMode={themeMode}
              style={{ marginTop: 6, width: 120, height: 32 }}
            />
          ) : null}
          <Text style={[styles.subtle, { marginTop: 6 }]}>
            Verified {formatDocumentDate(new Date(), locale)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.subtle}>{branding.website}</Text>
        <Text style={styles.subtle}>{branding.supportEmail}</Text>
        <Text style={styles.subtle}>{branding.supportPhone || "-"}</Text>
      </View>
      <View style={[styles.row, { marginTop: 6 }]}> 
        <Text style={styles.subtle}>{branding.supportAddress || "-"}</Text>
        <Text style={styles.subtle}>
          {(branding.socials || [])
            .map((social) => `${social.label}: ${social.value}`)
            .join(" | ") || "-"}
        </Text>
      </View>
    </View>
  );
};
