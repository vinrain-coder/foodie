import {
  Document,
  Image,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";
import { createReceiptStyles, getReceiptTheme } from "./styles";
import {
  CustomerSection,
  FooterSection,
  HeaderSection,
  PricingAndPaymentSection,
  MenuItemTableSection,
} from "./sections";
import type {
  ReceiptBranding,
  ReceiptDocumentData,
  ReceiptRenderOptions,
} from "./types";

const defaultBranding: ReceiptBranding = {
  brandName: "TumaFood",
  website: "www.tumafood.com",
  supportEmail: "support@tumafood.com",
  socials: [
    { label: "Instagram", value: "@tumafood" },
    { label: "X", value: "@tumafood" },
  ],
  accentText: "Luxury Footwear & Fashion",
};

type ReceiptDocumentProps = {
  data: ReceiptDocumentData;
  options?: ReceiptRenderOptions;
};

export const ReceiptPdfDocument = ({ data, options }: ReceiptDocumentProps) => {
  const theme = getReceiptTheme(options?.themeMode || "light");
  const themeMode = options?.themeMode || "light";
  const styles = createReceiptStyles(theme);
  const locale = options?.locale || data.locale || "en-KE";
  const currency = options?.currency || data.currency || "KES";
  const branding: ReceiptBranding = {
    ...defaultBranding,
    ...(options?.branding || {}),
  };

  return (
    <Document
      title={`${branding.brandName} ${data.kind}`}
      author={branding.brandName}
      subject={`Order ${data.orderId} ${data.kind}`}
      keywords={`${data.kind}, order, ${data.orderId}, ${branding.brandName}`}
      producer={`${branding.brandName} PDF Engine`}
      creator={`${branding.brandName} - @react-pdf/renderer`}
    >
      <Page
        size={options?.pageSize || "A4"}
        style={styles.page}
        wrap
      >
        {branding.watermarkLogoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={branding.watermarkLogoUrl} style={styles.watermark} fixed />
        ) : (
          <Text
            style={[
              styles.watermark,
              {
                fontSize: 72,
                textAlign: "center",
                color: theme.textMuted,
              },
            ]}
            fixed
          >
            {branding.brandName.toUpperCase()}
          </Text>
        )}

        <HeaderSection
          data={data}
          branding={branding}
          styles={styles}
          theme={theme}
          themeMode={themeMode}
          locale={locale}
          currency={currency}
        />

        <View style={{ height: 10 }} />

        <CustomerSection
          data={data}
          branding={branding}
          styles={styles}
          theme={theme}
          themeMode={themeMode}
          locale={locale}
          currency={currency}
        />

        <View style={{ height: 10 }} />

        <MenuItemTableSection
          data={data}
          branding={branding}
          styles={styles}
          theme={theme}
          themeMode={themeMode}
          locale={locale}
          currency={currency}
        />

        <View style={{ height: 10 }} />

        <PricingAndPaymentSection
          data={data}
          branding={branding}
          styles={styles}
          theme={theme}
          themeMode={themeMode}
          locale={locale}
          currency={currency}
        />

        <View style={{ height: 10 }} />

        <FooterSection
          data={data}
          branding={branding}
          styles={styles}
          theme={theme}
          themeMode={themeMode}
          locale={locale}
          currency={currency}
        />

        <View style={styles.footer} fixed>
          <Text>
            {branding.website}  •  {branding.supportEmail}
          </Text>
          <Text>
            {branding.legalLine || `© ${new Date().getFullYear()} ${branding.brandName}. All rights reserved.`}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
