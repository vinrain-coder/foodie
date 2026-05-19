import { inferAdditionalFields } from "better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";
import { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [inferAdditionalFields<typeof auth>(), nextCookies()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  sendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  updateUser,
  getSession,
  revokeSession,
  revokeSessions,
  changePassword,
} = authClient;
