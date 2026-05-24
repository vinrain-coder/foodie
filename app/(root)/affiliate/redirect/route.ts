import { getSetting } from "@/lib/actions/setting.actions";
import {
  AFFILIATE_TRACKING_COOKIE_KEY,
  LEGACY_AFFILIATE_TRACKING_COOKIE_KEYS,
} from "@/lib/affiliate-tracking";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");

  if (!ref) {
    return new Response("Missing ref parameter", { status: 400 });
  }

  const setting = await getSetting();
  const siteUrl = setting.site?.url || "";
  const cookieExpiryDays = Math.max(
    1,
    Number(setting.affiliate?.cookieExpiryDays || 30),
  );

  if (!siteUrl) {
    return new Response("Site URL not configured", { status: 500 });
  }

  // Set the cookie
  const cookieStore = await cookies();
  cookieStore.set(AFFILIATE_TRACKING_COOKIE_KEY, ref, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * cookieExpiryDays,
  });
  for (const legacyKey of LEGACY_AFFILIATE_TRACKING_COOKIE_KEYS) {
    cookieStore.set(legacyKey, ref, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * cookieExpiryDays,
    });
  }

  return Response.redirect(siteUrl, 302);
}
