/**
 * Common styles and layout for HTML emails.
 * Using inline CSS and table-based layouts for maximum compatibility.
 */

import { escapeHTML } from "@/lib/utils";

export const colors = {
  slate950: "#020617",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  blue600: "#2563eb",
  white: "#ffffff",
  emerald900: "#064e3b",
  emerald800: "#065f46",
  emerald700: "#047857",
  emerald200: "#a7f3d0",
  emerald50: "#ecfdf5",
  orange500: "#f97316",
  indigo600: "#4f46e5",
  red500: "#ef4444",
  green600: "#16a34a",
  green500: "#22c55e",
};

export function layout({
  preview,
  children,
  siteName,
  siteCopyright,
  logoSrc,
}: {
  preview: string;
  children: string;
  siteName: string;
  siteCopyright: string;
  logoSrc?: string;
}) {
  const escapedPreview = escapeHTML(preview);
  const escapedSiteName = escapeHTML(siteName);
  const escapedLogoSrc = logoSrc ? escapeHTML(logoSrc) : null;

  let footerLine = "";
  if (siteCopyright) {
    if (siteCopyright.includes("©")) {
      footerLine = escapeHTML(siteCopyright);
    } else {
      footerLine = `© ${new Date().getFullYear()} ${escapedSiteName}<br>${escapeHTML(siteCopyright)}`;
    }
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedPreview}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse !important;
    }
    .content-table {
      max-width: 600px !important;
    }
    @media only screen and (max-width: 620px) {
      .content-table {
        width: 100% !important;
        border-radius: 0 !important;
      }
      .body-padding {
        padding: 20px 10px !important;
      }
    }
  </style>
</head>
<body style="background-color: ${colors.slate50}; margin: 0; padding: 40px 0;" class="body-padding">
  <span style="display: none; max-height: 0px; overflow: hidden;">${escapedPreview}</span>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" class="content-table" style="background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid ${colors.slate200};">
          ${
            escapedLogoSrc
              ? `
          <tr>
            <td align="center" style="padding: 32px 0 0 0;">
              <img src="${escapedLogoSrc}" alt="${escapedSiteName}" height="48" style="display: block;">
            </td>
          </tr>
          `
              : ""
          }
          <tr>
            <td>
              ${children}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid ${colors.slate100}; padding-top: 32px;">
                <tr>
                  <td align="center">
                    ${socialLinks()}
                    <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 18px; color: ${colors.slate400}; text-align: center; font-weight: 500;">
                      ${footerLine}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function button({
  href,
  label,
  backgroundColor = colors.slate950,
}: {
  href: string;
  label: string;
  backgroundColor?: string;
}) {
  const escapedHref = escapeHTML(href);
  const escapedLabel = escapeHTML(label);
  const escapedBgColor = escapeHTML(backgroundColor);

  return `
    <table border="0" cellspacing="0" cellpadding="0" style="margin: 32px auto;">
      <tr>
        <td align="center" style="border-radius: 10px;" bgcolor="${escapedBgColor}">
          <a href="${escapedHref}" target="_blank" style="font-size: 16px; font-weight: 600; color: ${colors.white}; text-decoration: none; border-radius: 10px; padding: 16px 32px; display: inline-block; letter-spacing: -0.01em;">
            ${escapedLabel}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function divider() {
  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 32px 0;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid ${colors.slate100};">
            <tr><td></td></tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function socialLinks() {
  const links = {
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL || "#",
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || "#",
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "#",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#",
  };

  const platforms = [
    {
      name: "Facebook",
      icon: "https://cdn-icons-png.flaticon.com/512/733/733547.png",
      url: links.facebook,
    },
    {
      name: "Instagram",
      icon: "https://cdn-icons-png.flaticon.com/512/2111/2111463.png",
      url: links.instagram,
    },
    {
      name: "Twitter",
      icon: "https://cdn-icons-png.flaticon.com/512/3256/3256013.png",
      url: links.twitter,
    },
    {
      name: "Tiktok",
      icon: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
      url: links.tiktok,
    },
  ];

  return `
    <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
      <tr>
        ${platforms
          .filter((p) => p.url !== "#")
          .map(
            (p) => `
          <td style="padding: 0 10px;">
            <a href="${escapeHTML(p.url)}" target="_blank" style="text-decoration: none;">
              <img src="${escapeHTML(p.icon)}" width="20" height="20" alt="${escapeHTML(p.name)}" style="display: block; opacity: 0.6;">
            </a>
          </td>
        `,
          )
          .join("")}
      </tr>
    </table>
  `;
}
