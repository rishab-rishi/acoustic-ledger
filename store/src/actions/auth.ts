"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { isRateLimited } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function registerUser(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid details.",
    };
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  // Keyed on IP (the default when no rateLimitKey is passed): unlimited
  // account creation is both a spam vector and a database-growth vector.
  if (await isRateLimited("register-attempt", { headers: await headers() })) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return { ok: false, error: "An account with that email already exists." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(users).values({
      name,
      email,
      passwordHash,
      role: "customer",
    });

    return { ok: true };
  } catch (err) {
    // The find-then-insert above isn't atomic; two requests for the same
    // email can both pass the existence check and race to insert. The
    // unique index on users.email keeps the data correct either way, but
    // without this the race's loser got a generic failure instead of the
    // accurate "already exists" — same message the non-racing path returns.
    if ((err as { code?: string })?.code === "23505") {
      return { ok: false, error: "An account with that email already exists." };
    }
    console.error("[auth] registerUser failed:", err);
    return { ok: false, error: "Couldn't create your account. Try again." };
  }
}
