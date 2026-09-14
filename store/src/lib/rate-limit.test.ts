import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * isRateLimited() must never turn a limiter problem into an outage: a thrown
 * error or an unreachable Firewall API has to resolve to "not limited", not
 * propagate. See the docstring in rate-limit.ts for why.
 */
const checkRateLimit = vi.fn();
vi.mock("@vercel/firewall", () => ({ checkRateLimit: (...args: unknown[]) => checkRateLimit(...args) }));

const { isRateLimited } = await import("./rate-limit");

describe("isRateLimited", () => {
  beforeEach(() => {
    checkRateLimit.mockReset();
  });

  it("returns true when the firewall reports the request is limited", async () => {
    checkRateLimit.mockResolvedValue({ rateLimited: true });
    await expect(isRateLimited("test-id", { headers: new Headers() })).resolves.toBe(true);
  });

  it("returns false when the firewall reports the request is not limited", async () => {
    checkRateLimit.mockResolvedValue({ rateLimited: false });
    await expect(isRateLimited("test-id", { headers: new Headers() })).resolves.toBe(false);
  });

  it("fails open (returns false) when checkRateLimit throws", async () => {
    checkRateLimit.mockRejectedValue(new Error("Firewall API unreachable"));
    await expect(isRateLimited("test-id", { headers: new Headers() })).resolves.toBe(false);
  });

  it("fails open when the rate-limit ID has no matching dashboard rule yet", async () => {
    checkRateLimit.mockResolvedValue({ rateLimited: false, error: "not-found" });
    await expect(isRateLimited("unconfigured-id", { headers: new Headers() })).resolves.toBe(false);
  });

  it("forwards a custom rateLimitKey so per-account and per-IP buckets can be composed deliberately", async () => {
    checkRateLimit.mockResolvedValue({ rateLimited: false });
    await isRateLimited("auth-attempt", { headers: new Headers(), rateLimitKey: "login:a@b.test" });
    expect(checkRateLimit).toHaveBeenCalledWith(
      "auth-attempt",
      expect.objectContaining({ rateLimitKey: "login:a@b.test" })
    );
  });
});
