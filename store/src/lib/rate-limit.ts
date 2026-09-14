import { checkRateLimit } from "@vercel/firewall";

/**
 * Thin wrapper around `@vercel/firewall`'s `checkRateLimit()` that always
 * fails OPEN.
 *
 * `checkRateLimit()` makes a network round-trip to the Vercel Firewall API
 * and throws on several conditions of its own (no determinable client IP, an
 * unexpected response status) — on top of the plain fact that any network
 * call can fail. A rate limiter having a bad minute must never take
 * checkout, sign-in, or registration offline; that would be a
 * self-inflicted outage worse than the abuse it exists to prevent.
 *
 * DO NOT change this to fail closed. Any failure here — a thrown error, an
 * unreachable Firewall API, or the rate-limit ID not yet existing as a
 * dashboard rule (which `checkRateLimit` itself already treats as "not
 * limited", see its `error: "not-found"` case) — is logged and treated as
 * "not limited". See CLAUDE-CODE-TASKS.md §2.3 and SECURITY.md.
 */
export async function isRateLimited(
  rateLimitId: string,
  options: { headers: Headers; rateLimitKey?: string }
): Promise<boolean> {
  try {
    const { rateLimited } = await checkRateLimit(rateLimitId, {
      headers: options.headers,
      rateLimitKey: options.rateLimitKey,
    });
    return rateLimited;
  } catch (err) {
    console.error(`[rate-limit] "${rateLimitId}" check failed; failing open:`, err);
    return false;
  }
}
