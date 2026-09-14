import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The guest cart cookie carries a token that reads/mutates that cart with no
 * other check. Without `Secure` it would travel in clear text over any
 * plain-HTTP hop and be replayable — this pins that the cookie the app
 * actually sets is `Secure` in production and `HttpOnly` + `SameSite=Lax`
 * everywhere.
 *
 * `next/headers` only works inside a request, so the cookie jar is faked, same
 * as tests/cart-merge.test.ts. Needs a reachable DATABASE_URL (docker compose
 * up -d).
 */
type SetCall = { name: string; value: string; options?: Record<string, unknown> };

const jar = new Map<string, string>();
let setCalls: SetCall[] = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name)! } : undefined,
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      jar.set(name, value);
      setCalls.push({ name, value, options });
    },
    delete: (name: string) => jar.delete(name),
  }),
}));

vi.mock("@/auth", () => ({ auth: async () => null }));

const { getOrCreateCartId } = await import("@/lib/cart");

describe("getOrCreateCartId — guest cookie", () => {
  beforeEach(() => {
    jar.clear();
    setCalls = [];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets HttpOnly and SameSite=Lax regardless of environment", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await getOrCreateCartId();

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0].options).toMatchObject({ httpOnly: true, sameSite: "lax" });
  });

  it("sets Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await getOrCreateCartId();

    expect(setCalls[0].options).toMatchObject({ secure: true });
  });

  it("does not set Secure outside production, so local HTTP dev still works", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await getOrCreateCartId();

    expect(setCalls[0].options).toMatchObject({ secure: false });
  });
});
