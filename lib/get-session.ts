import { headers } from "next/headers";
import { auth } from "./auth";
import { normalizeUserRole } from "./dashboard-access";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  });

  if (!session?.user) return session;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(";")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isConfiguredAdmin =
    !!session.user.email &&
    adminEmails.includes(session.user.email.trim().toLowerCase());

  const normalizedRole = isConfiguredAdmin
    ? "ADMIN"
    : normalizeUserRole(session.user.role);
  if (!normalizedRole || normalizedRole === session.user.role) return session;

  return {
    ...session,
    user: {
      ...session.user,
      role: normalizedRole,
    },
  };
}

