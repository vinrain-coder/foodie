import { sendEmail } from "./send";
import {
  verifyEmailTemplate,
  resetPasswordTemplate,
  changeEmailTemplate,
  otpTemplate,
} from "./templates/auth-templates";
import { getSetting } from "../actions/setting.actions";

export async function sendVerifyEmail({
  email,
  name,
  url,
}: {
  email: string;
  name?: string;
  url: string;
}) {
  const { site } = await getSetting();
  await sendEmail({
    to: email,
    subject: "Verify your email",
    html: verifyEmailTemplate({ name, url, site }),
  });
}

export async function sendResetPasswordEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  const { site } = await getSetting();
  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: resetPasswordTemplate({ url, site }),
  });
}

export async function sendChangeEmailVerification({
  email,
  newEmail,
  url,
}: {
  email: string;
  newEmail: string;
  url: string;
}) {
  const { site } = await getSetting();
  await sendEmail({
    to: email,
    subject: "Approve email change",
    html: changeEmailTemplate({ newEmail, url, site }),
  });
}

export async function sendOTPEmail({
  email,
  code,
  name,
  type = "signin",
}: {
  email: string;
  code: string;
  name?: string;
  type?: "signin" | "signup" | "password-reset";
}) {
  const { site } = await getSetting();
  const typeLabels = {
    signin: "Sign in",
    signup: "Sign up",
    "password-reset": "Reset your password",
  };
  await sendEmail({
    to: email,
    subject: `${typeLabels[type]} verification code`,
    html: otpTemplate({ code, name, type, site }),
  });
}
