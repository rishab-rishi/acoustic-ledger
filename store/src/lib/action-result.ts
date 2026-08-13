/**
 * Server Actions return this instead of throwing.
 *
 * Next.js redacts thrown Server Action errors in production builds — the
 * client receives a generic React error digest, not the message. Anything
 * the user needs to read has to come back as a return value.
 *
 * `notice` carries a successful-but-adjusted outcome, e.g. a quantity that
 * had to be clamped to available stock.
 */
export type ActionResult =
  | { ok: true; notice?: string }
  | { ok: false; error: string };
