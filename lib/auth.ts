import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as schema from "@/db/schema";
import { db } from "@/db";
import { LanguageCode } from "./languages";

export const auth = betterAuth({
    // BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from env automatically
    appName: "My App",

    user: {
        additionalFields: {
            language: {
                type: "string" as const,
                required: false,
                defaultValue: "en" satisfies LanguageCode,
                input: true,
            },
        },
    },

    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),

    emailAndPassword: {
        enabled: true,
        // Uncomment to require email verification before sign-in:
        // requireEmailVerification: true,
        // sendResetPassword: async ({ user, url }) => { /* send email */ },
    },

    // emailVerification: {
    //   sendVerificationEmail: async ({ user, url }) => { /* send email */ },
    //   sendOnSignUp: true,
    // },

    session: {
        expiresIn: 60 * 60 * 24 * 7,   // 7 days
        updateAge: 60 * 60 * 24,        // refresh if older than 1 day
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5,               // cache in cookie for 5 min
        },
    },

    // socialProviders: {
    //   google: {
    //     clientId: process.env.GOOGLE_CLIENT_ID!,
    //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //   },
    //   github: {
    //     clientId: process.env.GITHUB_CLIENT_ID!,
    //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    //   },
    // },

    plugins: [
        nextCookies(), // Required for Server Components / Server Actions
    ],

    advanced: {
        useSecureCookies: process.env.SECURE_COOKIES === "true",
    },

    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") ?? [],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;