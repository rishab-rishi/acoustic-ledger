import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { authorizeCredentials } from "@/lib/authorize-credentials";
import { mergeGuestCartIntoUserCart } from "@/lib/cart";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: authorizeCredentials,
  }),
];

// Google is optional per the build spec — only register it when configured,
// otherwise Auth.js throws on a provider with an undefined client id.
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      // Carry a guest cart over to the account being signed into. A failure
      // here must not block the sign-in itself — the cart is recoverable,
      // a broken login is not.
      if (user.id) {
        try {
          await mergeGuestCartIntoUserCart(user.id);
        } catch (err) {
          console.error("[auth] cart merge on sign-in failed:", err);
        }
      }
      return true;
    },
  },
});
