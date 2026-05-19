import { StyleSheet } from "@react-pdf/renderer";
import type { ReceiptThemeMode } from "./types";

export type ReceiptThemeTokens = {
  bg: string;
  panel: string;
  textPrimary: string;
  textMuted: string;
  borderSoft: string;
  accent: string;
  accentMuted: string;
  successBg: string;
  successText: string;
  warningBg: string;
  warningText: string;
  dangerBg: string;
  dangerText: string;
  watermark: number;
};

const lightTokens: ReceiptThemeTokens = {
  bg: "#F6F7F8",
  panel: "#FFFFFF",
  textPrimary: "#101418",
  textMuted: "#5C636B",
  borderSoft: "#E6E9ED",
  accent: "#20252B",
  accentMuted: "#EFF2F4",
  successBg: "#EAF5ED",
  successText: "#1C5F35",
  warningBg: "#F6F2E8",
  warningText: "#705928",
  dangerBg: "#F8EBEA",
  dangerText: "#7A2F2A",
  watermark: 0.05,
};

const darkTokens: ReceiptThemeTokens = {
  bg: "#121418",
  panel: "#191C21",
  textPrimary: "#F2F5F7",
  textMuted: "#BCC2C9",
  borderSoft: "#2A2F36",
  accent: "#E8EBEE",
  accentMuted: "#20252D",
  successBg: "#1D2D22",
  successText: "#9BE2B6",
  warningBg: "#2E2B1E",
  warningText: "#E5D3A2",
  dangerBg: "#322224",
  dangerText: "#F1B9B3",
  watermark: 0.08,
};

export const getReceiptTheme = (mode: ReceiptThemeMode = "light") =>
  mode === "dark" ? darkTokens : lightTokens;

export const createReceiptStyles = (theme: ReceiptThemeTokens) =>
  StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 10,
      backgroundColor: theme.bg,
      paddingTop: 34,
      paddingBottom: 88,
      paddingHorizontal: 34,
      color: theme.textPrimary,
      lineHeight: 1.45,
    },
    watermark: {
      position: "absolute",
      top: "34%",
      left: "20%",
      width: 360,
      opacity: theme.watermark,
    },
    card: {
      backgroundColor: theme.panel,
      borderRadius: 12,
      borderColor: theme.borderSoft,
      borderWidth: 1,
      padding: 16,
    },
    divider: {
      borderBottomColor: theme.borderSoft,
      borderBottomWidth: 1,
      marginVertical: 10,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    grow: {
      flexGrow: 1,
      flexBasis: 0,
    },
    title: {
      fontSize: 21,
      letterSpacing: 1.4,
      color: theme.accent,
    },
    sectionTitle: {
      fontSize: 9,
      textTransform: "uppercase",
      letterSpacing: 1.3,
      color: theme.textMuted,
      marginBottom: 8,
    },
    label: {
      fontSize: 8,
      color: theme.textMuted,
      marginBottom: 2,
    },
    body: {
      fontSize: 10,
      color: theme.textPrimary,
    },
    subtle: {
      color: theme.textMuted,
      fontSize: 9,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 8,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      alignSelf: "flex-start",
    },
    tableHead: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSoft,
      paddingBottom: 10,
      marginBottom: 4,
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSoft,
      paddingVertical: 12,
    },
    tableColImage: {
      width: "14%",
      paddingRight: 8,
    },
    tableColMenuItem: {
      width: "36%",
      paddingRight: 8,
    },
    tableColVariant: {
      width: "16%",
      paddingRight: 8,
    },
    tableColQty: {
      width: "10%",
      textAlign: "right",
      paddingRight: 8,
    },
    tableColUnit: {
      width: "12%",
      textAlign: "right",
      paddingRight: 8,
    },
    tableColTotal: {
      width: "12%",
      textAlign: "right",
    },
    thumbWrap: {
      width: 44,
      height: 44,
      borderRadius: 8,
      borderColor: theme.borderSoft,
      borderWidth: 1,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.accentMuted,
    },
    thumb: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    priceTotal: {
      fontSize: 16,
      color: theme.accent,
    },
    footer: {
      position: "absolute",
      left: 34,
      right: 34,
      bottom: 24,
      borderTopWidth: 1,
      borderTopColor: theme.borderSoft,
      paddingTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      fontSize: 8,
      color: theme.textMuted,
    },
  });
