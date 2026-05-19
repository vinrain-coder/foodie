import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { getOrderById } from "@/lib/actions/order.actions";
import { getSetting } from "@/lib/actions/setting.actions";
import {
  buildOrderInvoicePdf,
  buildOrderReceiptPdf,
  getOrderPdfFileName,
} from "@/lib/order-receipt-pdf";
import { buildReceiptBrandingFromSetting } from "@/lib/pdf/receipt/branding";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Connect to MongoDB at runtime
  await connection();

  // Check user session
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Get order ID from route params
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  const requestUrl = new URL(req.url);
  const typeParam = requestUrl.searchParams.get("type");
  const kind = typeParam === "invoice" ? "invoice" : "receipt";
  const baseUrl = requestUrl.origin;
  const setting = await getSetting();
  const branding = buildReceiptBrandingFromSetting(setting, baseUrl);
  const themeMode = setting.common.defaultTheme === "dark" ? "dark" : "light";
  const locale = setting.defaultLanguage || "en-US";
  const currency = setting.defaultCurrency || "KES";

  // Generate PDF
  const pdfBuffer =
    kind === "invoice"
      ? await buildOrderInvoicePdf(order, {
          baseUrl,
          branding,
          themeMode,
          locale,
          currency,
        })
      : await buildOrderReceiptPdf(order, {
          baseUrl,
          branding,
          themeMode,
          locale,
          currency,
        });
  const fileName = getOrderPdfFileName(order._id, kind);

  // Return PDF as response
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${fileName}`,
      "Cache-Control": "no-store",
    },
  });
}
