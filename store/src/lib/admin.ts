import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type AdminUser = { id: string; email: string; name: string | null };

/**
 * Gate for admin pages.
 *
 * `proxy.ts` already blocks /admin, but it gates by *path*, and its matcher is
 * a list someone has to remember to update. Server actions are the real gap:
 * they POST to whatever URL the user is currently on, so an action imported
 * into a page outside the matcher would never pass through the proxy at all.
 * Authorisation therefore lives with the thing being protected.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) redirect("/login?callbackUrl=/admin");
  if (user.role !== "admin") redirect("/");

  return { id: user.id, email: user.email ?? "", name: user.name ?? null };
}

/**
 * The same check for server actions, which must never redirect — they return a
 * result the client renders. Returns null when the caller is an admin, or the
 * error to hand straight back.
 */
export async function adminGuard(): Promise<{ error: string } | null> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { error: "You don't have permission to do that." };
  }
  return null;
}
