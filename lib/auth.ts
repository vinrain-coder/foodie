import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";

import { passwordSchema } from "./validator";
import { getDb } from "./db/client";

import {
  sendChangeEmailVerification,
  sendResetPasswordEmail,
  sendVerifyEmail,
} from "./email/auth-emails";
import {
  sendAdminEventNotification,
  sendWelcomeNewUserEmail,
} from "@/lib/email/transactional";

const db = await getDb();

type SessionCreatedEvent = {
  session: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  };
};

export const auth = betterAuth({
  database: mongodbAdapter(db),

  baseURL: process.env.NEXT_PUBLIC_APP_URL,

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "jwe",
    },
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    storeSessionInDatabase: true,
    additionalFields: {
      userAgent: {
        type: "string",
        input: false,
      },
      ipAddress: {
        type: "string",
        input: false,
      },
    },
  },

  cookies: {
    sessionToken: {
      name: "session_token",
      attributes: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    },
    callbackURL: {
      name: "callback_url",
      attributes: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      },
    },
  },

  csrf: {
    enabled: true,
    protectActionPath: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account",
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: false,
    requireEmailVerification: true,
    passwordValidation: async (password: string) => {
      const { error } = passwordSchema.safeParse(password);
      return !error;
    },
    async sendResetPassword({ user, url }) {
      await sendResetPasswordEmail({
        email: user.email,
        url,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    async sendVerificationEmail({ user, url }) {
      await sendVerifyEmail({
        email: user.email,
        name: user.name,
        url,
      });
    },
  },

  phone: {
    enabled: false,
  },

  user: {
    modelName: "users",
    changeEmail: {
      enabled: true,
      async sendChangeEmailVerification({
        user,
        newEmail,
        url,
      }: {
        user: { email: string };
        newEmail: string;
        url: string;
      }) {
        await sendChangeEmailVerification({
          email: user.email,
          newEmail,
          url,
        });
      },
    },
    additionalFields: {
      role: {
        type: "string",
        input: false,
        defaultValue: "USER",
        options: ["USER", "ADMIN", "RESTAURANT", "RIDER"],
      },
      subscription: {
        type: "string",
        input: false,
        defaultValue: "FREE",
      },
      subscriptionStatus: {
        type: "string",
        input: false,
        defaultValue: "inactive",
      },
      subscriptionExpiresAt: {
        type: "date",
        input: false,
      },
      wishlist: {
        type: "json",
        input: false,
      },
      addresses: {
        type: "json",
        input: false,
      },
      coins: {
        type: "number",
        input: false,
        defaultValue: 0,
      },
      isAffiliate: {
        type: "boolean",
        input: false,
        defaultValue: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(";") ?? [];
          const addresses = Array.isArray(user.addresses) ? user.addresses : [];
          const wishlist = Array.isArray(user.wishlist) ? user.wishlist : [];

          if (ADMIN_EMAILS.includes(user.email)) {
            return {
              data: {
                ...user,
                role: "ADMIN",
                addresses,
                wishlist,
                isAffiliate: user.isAffiliate || false,
              },
            };
          }
          return {
            data: {
              ...user,
              addresses,
              wishlist,
              isAffiliate: user.isAffiliate || false,
            },
          };
        },
      },
    },
  },

  events: {
    user: {
      created: async ({
        user,
      }: {
        user: {
          role?: string;
          name?: string;
          email?: string;
          emailVerified?: boolean;
        };
      }) => {
        if (user.role === "ADMIN") return;
        await sendAdminEventNotification({
          title: "New customer account",
          description: `${user.name || user.email} created an account${user.email ? ` with ${user.email}` : ""}.`,
          href: "/admin/users",
          meta: user.emailVerified ? "Email verified" : "Needs verification",
          createdAt: new Date().toISOString(),
        });
        if (user.email) {
          try {
            await sendWelcomeNewUserEmail({
              email: user.email,
              name: user.name,
            });
          } catch (error) {
            console.error("Non-critical: Failed to send welcome email:", error);
          }
        }
      },
    },
    session: {
      created: async (event: SessionCreatedEvent) => {
        await db.collection("auditLogs").insertOne({
          userId: event.session.userId,
          action: "session_created",
          ipAddress: event.session.ipAddress || "unknown",
          userAgent: event.session.userAgent || "unknown",
          createdAt: new Date(),
        });
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      // Allow Google (trusted provider) to link to an existing local account
      // even if the local email/password account is not yet verified.
      requireLocalEmailVerified: false,
    },
  },

  plugins: [jwt()],

  advanced: {
    cookiePrefix: "tumafood_auth",
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
