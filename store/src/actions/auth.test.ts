import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A rate-limited registration must come back as the normal ActionResult
 * error shape — never throw — per the documented Server Action convention.
 */
const isRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: (...args: unknown[]) => isRateLimited(...args) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// registerUser also touches the database on the non-limited path; this suite
// only exercises the limited path, so the db mock is never called into.
vi.mock("@/db", () => ({
  db: { query: { users: { findFirst: vi.fn() } }, insert: vi.fn() },
}));

const { registerUser } = await import("./auth");

describe("registerUser — rate limiting", () => {
  beforeEach(() => {
    isRateLimited.mockReset();
  });

  it("returns an ActionResult error, not a throw, when rate-limited", async () => {
    isRateLimited.mockResolvedValue(true);

    const result = await registerUser({
      name: "Test User",
      email: "test@example.test",
      password: "password123",
    });

    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });

  it("checks the register-attempt limit", async () => {
    isRateLimited.mockResolvedValue(true);
    await registerUser({
      name: "Test User",
      email: "test@example.test",
      password: "password123",
    });
    expect(isRateLimited).toHaveBeenCalledWith(
      "register-attempt",
      expect.anything()
    );
  });
});
