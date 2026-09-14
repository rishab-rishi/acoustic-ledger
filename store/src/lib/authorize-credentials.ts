import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * The Credentials provider's `authorize`. Split out of auth.ts (which also
 * bootstraps NextAuth itself, with side effects like the Drizzle adapter)
 * so this — the part with actual logic — can be unit tested in isolation.
 *
 * Rate-limited on the account (`login:<email>`), not the caller's IP: passing
 * a rateLimitKey replaces the per-IP bucket entirely (see @vercel/firewall's
 * docs) — that's exactly what we want here, so distributed guessing against
 * one account from many IPs is still caught. A limited attempt returns
 * `null`, indistinguishable from a wrong password, so the limit itself can't
 * be used as an email-existence oracle.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>>,
  request: Request
) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const email = parsed.data.email.toLowerCase();

  if (
    await isRateLimited("auth-attempt", {
      headers: request.headers,
      rateLimitKey: `login:${email}`,
    })
  ) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Users created via OAuth have no password hash — they can't sign in
  // through this provider. Compare anyway is pointless, so bail early.
  if (!user?.passwordHash) return null;

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}
