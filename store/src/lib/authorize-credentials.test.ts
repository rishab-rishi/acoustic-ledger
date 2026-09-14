import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A rate-limited sign-in attempt must return `null` — exactly what a wrong
 * password returns — so the rate limit itself can't be used to check whether
 * an email is registered.
 */
const isRateLimited = vi.fn();
const findFirst = vi.fn();

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: (...args: unknown[]) => isRateLimited(...args) }));
vi.mock("@/db", () => ({ db: { query: { users: { findFirst: (...args: unknown[]) => findFirst(...args) } } } }));

const { authorizeCredentials } = await import("./authorize-credentials");

function request() {
  return new Request("https://example.com/api/auth/callback/credentials", { method: "POST" });
}

describe("authorizeCredentials", () => {
  beforeEach(() => {
    isRateLimited.mockReset();
    findFirst.mockReset();
  });

  it("returns null when rate-limited, without looking up the user", async () => {
    isRateLimited.mockResolvedValue(true);

    const result = await authorizeCredentials(
      { email: "user@example.test", password: "whatever" },
      request()
    );

    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("keys the limit on the lowercased email, not the IP", async () => {
    isRateLimited.mockResolvedValue(false);
    findFirst.mockResolvedValue(null);

    await authorizeCredentials({ email: "USER@Example.Test", password: "x" }, request());

    expect(isRateLimited).toHaveBeenCalledWith(
      "auth-attempt",
      expect.objectContaining({ rateLimitKey: "login:user@example.test" })
    );
  });

  it("still returns null for a wrong password when not limited (same shape as the limited case)", async () => {
    isRateLimited.mockResolvedValue(false);
    const passwordHash = await bcrypt.hash("correct-password", 10);
    findFirst.mockResolvedValue({
      id: "u1",
      email: "user@example.test",
      passwordHash,
      name: "User",
      image: null,
      role: "customer",
    });

    const result = await authorizeCredentials(
      { email: "user@example.test", password: "wrong-password" },
      request()
    );

    expect(result).toBeNull();
  });

  it("returns the user on a correct, non-limited attempt", async () => {
    isRateLimited.mockResolvedValue(false);
    const passwordHash = await bcrypt.hash("correct-password", 10);
    findFirst.mockResolvedValue({
      id: "u1",
      email: "user@example.test",
      passwordHash,
      name: "User",
      image: null,
      role: "customer",
    });

    const result = await authorizeCredentials(
      { email: "user@example.test", password: "correct-password" },
      request()
    );

    expect(result).toEqual({
      id: "u1",
      email: "user@example.test",
      name: "User",
      image: null,
      role: "customer",
    });
  });
});
