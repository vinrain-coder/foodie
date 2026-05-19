import { getSetting } from "@/lib/actions/setting.actions";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");

  if (!ref) {
    return new Response("Missing ref parameter", { status: 400 });
  }

  const setting = await getSetting();
  const siteUrl = setting.site?.url || "";

  if (!siteUrl) {
    return new Response("Site URL not configured", { status: 500 });
  }

  // Set the cookie
  const cookieStore = await cookies();
  cookieStore.set("affiliateCode", ref, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return Response.redirect(siteUrl, 302);
}
