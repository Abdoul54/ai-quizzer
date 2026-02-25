import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { auth } from "./auth";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    plugins: [
        inferAdditionalFields<typeof auth>(),
    ]
});

export type Session = typeof authClient.$Infer.Session

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;