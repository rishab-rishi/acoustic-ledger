import type { DefaultSession } from "next-auth";

type UserRole = "customer" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

// `next-auth/jwt` only does `export * from "@auth/core/jwt"`, and `export *`
// does not forward declaration merging — the interface has to be augmented
// where it is actually declared.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
