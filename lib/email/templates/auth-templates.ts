import { colors, layout } from "./layout";
import { escapeHTML } from "@/lib/utils";

type AuthEmailLayoutProps = {
  preview: string;
  title: string;
  greeting: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  note?: string;
  outro?: string;
  supportText?: string;
  site: {
    name: string;
    url: string;
    logo: string;
    email: string;
    address: string;
    copyright: string;
  };
};

type AuthTemplateSite = AuthEmailLayoutProps["site"];

export function authEmailTemplate({
  preview,
  title,
  greeting,
  intro,
  ctaLabel,
  ctaUrl,
  note,
  outro,
  supportText,
  site,
}: AuthEmailLayoutProps) {
  const escapedSiteEmail = escapeHTML(site.email);
  const supportLine = supportText
    ? escapeHTML(supportText)
    : `If you need help, reply to this email or contact ${escapedSiteEmail}.`;

  const logoSrc = site.logo.startsWith("/")
    ? `${site.url}${site.logo}`
    : site.logo;
  const escapedTitle = escapeHTML(title);
  const escapedGreeting = escapeHTML(greeting);
  const escapedIntro = escapeHTML(intro);
  const escapedCtaUrl = escapeHTML(ctaUrl);
  const escapedNote = note
    ? escapeHTML(note)
    : "For your security, this link can only be used for the intended account action and may expire after a limited time.";
  const escapedOutro = outro ? escapeHTML(outro) : "";

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 32px; color: ${colors.slate950}; text-align: center;">
            ${escapedTitle}
          </h1>
          <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            ${escapedGreeting}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            ${escapedIntro}
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
              <td align="center">
                <a href="${escapedCtaUrl}" style="display: inline-block; background-color: ${colors.blue600}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">${escapeHTML(ctaLabel)}</a>
              </td>
            </tr>
          </table>

          ${escapedOutro ? `<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${colors.slate600};">${escapedOutro}</p>` : ""}

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${colors.slate50}; border: 1px solid ${colors.slate100}; border-radius: 12px;">
            <tr>
              <td style="padding: 16px 20px;">
                <p style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${colors.slate400};">
                  Security note
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; line-height: 20px; color: ${colors.slate500};">
                  ${escapedNote}
                </p>
              </td>
            </tr>
          </table>

          <p style="margin: 32px 0 0 0; font-size: 13px; line-height: 20px; color: ${colors.slate400}; text-align: center;">
            If the button above doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin: 8px 0 0 0; word-break: break-all; font-size: 12px; line-height: 18px; text-align: center;">
            <a href="${escapedCtaUrl}" style="color: ${colors.blue600}; text-decoration: none;">
              ${escapedCtaUrl}
            </a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 32px 32px 32px;">
           <p style="margin: 0; font-size: 13px; line-height: 20px; color: ${colors.slate500}; text-align: center;">
            ${supportLine}
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview,
    children: content,
    siteName: site.name,
    siteCopyright: site.address,
    logoSrc: logoSrc,
  });
}

export function verifyEmailTemplate({
  name,
  url,
  site,
}: {
  name?: string;
  url: string;
  site: AuthTemplateSite;
}) {
  return authEmailTemplate({
    ctaLabel: "Verify email address",
    ctaUrl: url,
    greeting: `Hi ${name ?? "there"},`,
    intro:
      "Thanks for creating your account. Confirm your email address to activate your account and start shopping securely.",
    note: "This verification link is tied to your account and helps us protect your sign-in experience. If you did not create an account, you can safely ignore this email.",
    preview: "Confirm your email address to finish setting up your account",
    title: "Verify your email address",
    site,
  });
}

export function resetPasswordTemplate({
  url,
  site,
}: {
  url: string;
  site: AuthTemplateSite;
}) {
  return authEmailTemplate({
    ctaLabel: "Reset password",
    ctaUrl: url,
    greeting: "Hi there,",
    intro:
      "We received a request to reset the password for your account. Use the secure link below to choose a new password.",
    note: "If you did not request a password reset, no action is required. Your current password will remain unchanged until a new one is created.",
    outro:
      "For best security, choose a unique password you do not use on any other website or app.",
    preview: "Reset your password with this secure link",
    title: "Reset your password",
    site,
  });
}

export function changeEmailTemplate({
  newEmail,
  url,
  site,
}: {
  newEmail: string;
  url: string;
  site: AuthTemplateSite;
}) {
  return authEmailTemplate({
    ctaLabel: "Approve email change",
    ctaUrl: url,
    greeting: "Hi there,",
    intro: `We received a request to change the email on your account to ${newEmail}. Confirm this change to continue.`,
    note: "If you did not request this update, do not approve it. We recommend reviewing your account security and changing your password immediately.",
    outro:
      "Approving this request will update the email address used to sign in and receive account notifications.",
    preview: "Confirm the new email address for your account",
    title: "Confirm your new email address",
    site,
  });
}

export function otpTemplate({
  code,
  name,
  type,
  site,
}: {
  code: string;
  name?: string;
  type: "signin" | "signup" | "password-reset";
  site: AuthTemplateSite;
}) {
  const typeLabels = {
    signin: "Sign in",
    signup: "Sign up",
    "password-reset": "Reset your password",
  };

  const logoSrc = site.logo.startsWith("/")
    ? `${site.url}${site.logo}`
    : site.logo;
  const greeting = `Hi ${name ?? "there"},`;
  const intro = `Your verification code for ${typeLabels[type]} is:`;
  const escapedCode = escapeHTML(code);

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 32px; color: ${colors.slate950}; text-align: center;">
            Your verification code
          </h1>
          <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            ${escapeHTML(greeting)}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            ${escapeHTML(intro)}
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
            <tr>
              <td align="center">
                <div style="display: inline-block; background-color: ${colors.slate50}; border: 2px solid ${colors.blue600}; border-radius: 12px; padding: 20px 40px;">
                  <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${colors.blue600}; font-family: monospace;">
                    ${escapedCode}
                  </span>
                </div>
              </td>
            </tr>
          </table>

          <p style="margin: 0; font-size: 14px; line-height: 20px; color: ${colors.slate500}; text-align: center;">
            This code expires in 10 minutes. Do not share it with anyone.
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${colors.slate50}; border: 1px solid ${colors.slate100}; border-radius: 12px; margin-top: 24px;">
            <tr>
              <td style="padding: 16px 20px;">
                <p style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${colors.slate400};">
                  Security note
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; line-height: 20px; color: ${colors.slate500};">
                  If you did not request this code, you can safely ignore this email. Your account remains secure.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 32px 32px 32px;">
           <p style="margin: 0; font-size: 13px; line-height: 20px; color: ${colors.slate500}; text-align: center;">
            If you need help, reply to this email or contact ${escapeHTML(site.email)}.
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `Your ${typeLabels[type]} verification code`,
    children: content,
    siteName: site.name,
    siteCopyright: site.address,
    logoSrc: logoSrc,
  });
}
