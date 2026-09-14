import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAuthorized } from "./route";

/**
 * /api/health leaks infrastructure detail (host, region, env var names, driver
 * errors) to an authorized caller only. These tests pin the fence: no token
 * configured, no header sent, or a mismatched header must all fall to the
 * unauthenticated (minimal-body) path — never open.
 */
describe("isAuthorized", () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.HEALTH_TOKEN;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  function request(header?: string) {
    const headers = new Headers();
    if (header !== undefined) headers.set("x-health-token", header);
    return new Request("https://example.com/api/health", { headers });
  }

  it("is unauthorized when HEALTH_TOKEN is unset, even with a header present", () => {
    expect(isAuthorized(request("anything"))).toBe(false);
    expect(isAuthorized(request())).toBe(false);
  });

  it("is unauthorized with no header sent", () => {
    process.env.HEALTH_TOKEN = "correct-horse-battery-staple";
    expect(isAuthorized(request())).toBe(false);
  });

  it("is unauthorized when the header doesn't match", () => {
    process.env.HEALTH_TOKEN = "correct-horse-battery-staple";
    expect(isAuthorized(request("wrong"))).toBe(false);
  });

  it("is unauthorized when the header is a different length than the token", () => {
    process.env.HEALTH_TOKEN = "short";
    expect(isAuthorized(request("shorter-or-longer-than-short"))).toBe(false);
  });

  it("is authorized when the header exactly matches the token", () => {
    process.env.HEALTH_TOKEN = "correct-horse-battery-staple";
    expect(isAuthorized(request("correct-horse-battery-staple"))).toBe(true);
  });
});
