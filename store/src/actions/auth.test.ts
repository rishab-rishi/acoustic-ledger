import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * registerUser has two things worth pinning without a real database:
 * - a rate-limited registration comes back as the normal ActionResult error
 *   shape, never a throw, per the documented Server Action convention;
 * - the find-then-insert isn't atomic, so the loser of a concurrent
 *   registration race must get the same friendly "already exists" message
 *   the ordinary duplicate-check path returns, not a generic failure.
 */
const isRateLimited = vi.fn();
const findFirst = vi.fn();
const values = vi.fn();

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: (...args: unknown[]) => isRateLimited(...args) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/db", () => ({
  db: {
    query: { users: { findFirst: (...args: unknown[]) => findFirst(...args) } },
    insert: () => ({ values: (...args: unknown[]) => values(...args) }),
  },
}));

const { registerUser } = await import("./auth");

const input = { name: "Test User", email: "test@example.test", password: "password123" };

describe("registerUser — rate limiting", () => {
  beforeEach(() => {
    isRateLimited.mockReset();
    findFirst.mockReset();
    values.mockReset();
  });

  it("returns an ActionResult error, not a throw, when rate-limited", async () => {
    isRateLimited.mockResolvedValue(true);

    const result = await registerUser(input);

    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });

  it("checks the register-attempt limit", async () => {
    isRateLimited.mockResolvedValue(true);
    await registerUser(input);
    expect(isRateLimited).toHaveBeenCalledWith("register-attempt", expect.anything());
  });
});

describe("registerUser — race safety", () => {
  beforeEach(() => {
    isRateLimited.mockReset();
    isRateLimited.mockResolvedValue(false);
    findFirst.mockReset();
    values.mockReset();
  });

  it("returns the same 'already exists' message when the insert loses a race, not a generic failure", async () => {
    // Simulates the race window: the existence check passes (nobody found
    // yet) but a concurrent request's insert commits first, so this one's
    // insert hits the unique index on users.email.
    findFirst.mockResolvedValue(null);
    values.mockRejectedValue({ code: "23505" });

    const result = await registerUser(input);

    expect(result).toEqual({ ok: false, error: "An account with that email already exists." });
  });

  it("still reports a generic failure for any other insert error", async () => {
    findFirst.mockResolvedValue(null);
    values.mockRejectedValue(new Error("connection reset"));

    const result = await registerUser(input);

    expect(result).toEqual({ ok: false, error: "Couldn't create your account. Try again." });
  });
});
