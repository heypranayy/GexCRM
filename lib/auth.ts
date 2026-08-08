import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin } from "better-auth/plugins";
import { prismadb } from "@/lib/prisma";
import { ac, admin, manager, user } from "@/lib/auth-permissions";
import { newUserNotify } from "@/lib/new-user-notify";

export const auth = betterAuth({
  database: prismaAdapter(prismadb, { provider: "postgresql" }),
  secret:
    process.env.BETTER_AUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "gexart-crm-local-dev-secret-32chars-min"
      : undefined),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  advanced: {
    database: {
      generateId: "uuid",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  user: {
    modelName: "Users",
    fields: {
      createdAt: "created_on",
      updatedAt: "updated_at",
      image: "image",
    },
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
      userStatus: {
        type: "string",
        defaultValue: "ACTIVE",
        input: false,
      },
      userLanguage: {
        type: "string",
        defaultValue: "en",
        input: false,
      },
      avatar: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  socialProviders:
    process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
          },
        }
      : {},

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  plugins: [
    adminPlugin({
      ac,
      roles: { admin, manager, user },
      defaultRole: "user",
    }),
  ],

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  callbacks: {
    async onUserCreated(user: { id: string }) {
      const count = await prismadb.users.count();
      if (count === 1) {
        await prismadb.users.update({
          where: { id: user.id },
          data: { role: "admin", userStatus: "ACTIVE" },
        });
      } else {
        const dbUser = await prismadb.users.findUnique({ where: { id: user.id } });
        if (dbUser) {
          await newUserNotify(dbUser);
        }
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;
