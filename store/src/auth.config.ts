import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js config.
 *
 * `middleware.ts` runs on the edge runtime, where bcrypt and the Postgres
 * driver can't be bundled. Everything here must stay dependency-free so the
 * middleware can decode the session JWT and gate routes; the adapter and
 * providers live in `auth.ts`, which only ever runs on Node.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Runs on sign-in (with `user`) and on every subsequent token read.
    jwt({ token, user }) {
      // `user` is only present on the sign-in pass; afterwards the claims
      // already live on the token.
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
    // Used by middleware. Returning false redirects to `pages.signIn`.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;

      if (pathname.startsWith("/admin")) {
        return user?.role === "admin";
      }
      if (pathname.startsWith("/orders")) {
        return !!user;
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
