import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 renamed the `middleware` convention to `proxy`.
// This only decodes the session JWT and runs `authorized` — see the note in
// auth.config.ts about why the adapter/providers aren't imported here.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/orders/:path*"],
};
