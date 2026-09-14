# Security posture — Acoustic Ledger

Companion to `CLAUDE-CODE-TASKS.md`. Two kinds of content live here:

1. Things that are code and are done (with the commit that did them).
2. Things that are **not code** — Vercel dashboard configuration, plan
   decisions, and operational checklists — that a human has to apply. Nothing
   in this file that says "dashboard-only" can be done by an agent; it's
   written here so it's reviewable and reproducible instead of tribal
   knowledge.

This file will grow as later phases land. This section covers Phase 1.

---

## Content-Security-Policy — verification required before enforcing

`next.config.ts` ships a CSP as `Content-Security-Policy-Report-Only` (flip
to enforcing with `CSP_ENFORCE=1`). **It has not yet been verified against a
real browser completing a PayPal sandbox checkout**, because that requires a
human driving an actual browser through the PayPal popup/login flow — not
something this pass could do headlessly.

**Before setting `CSP_ENFORCE=1` anywhere, including in Vercel Preview:**

1. Run the app (`npm run dev` or a production build with `npm start`).
2. Open DevTools → Console, and the Network tab.
3. Walk the full flow: add a product to cart → `/cart` → `/checkout` → click
   the PayPal button → complete the sandbox popup/login → land on
   `/checkout/success`.
4. Watch the console for `[Report Only]` Content-Security-Policy messages —
   each one names the directive that would have blocked something, and the
   blocked URL. Fix the directive in `next.config.ts` and repeat.
5. Only once a full run produces zero CSP console messages, set
   `CSP_ENFORCE=1` and repeat the same walk once more against the now-
   enforcing header to confirm nothing actually breaks.

If step 5 ships broken, checkout is broken — silently, since a blocked
PayPal script/frame fails closed with no error dialog of its own.

The current directive set is built from PayPal's documented Smart Buttons
requirements (`www.paypal.com` / `www.sandbox.paypal.com` /
`*.paypal.com` / `*.paypalobjects.com` for script, frame, image and connect
sources) plus `'unsafe-inline'` on `script-src` and `style-src`. That last
part is a real trade-off, not an oversight — see the comment in
`next.config.ts`. A nonce-based policy would be stronger but requires every
matched page to render dynamically, which would undo the catalog caching
Phase 5.2 is for.

## HEALTH_TOKEN

Set in Vercel env vars (see `DEPLOY.md`) so `/api/health`'s detailed
diagnostic (host, region, env var presence, driver errors) is only visible to
whoever holds the token. Leaving it unset is safe — the route just never
serves the detailed body — but you lose the diagnostic.

---

## Dashboard checklist (cannot be done from this repo)

- [ ] Set `HEALTH_TOKEN` in Vercel → Project → Settings → Environment
      Variables (Production, and Preview if used).
- [ ] Verify the CSP per the walkthrough above, then set `CSP_ENFORCE=1`.
- [ ] *(Phase 2/3 add more items here — Firewall rules, spend caps, Attack
      Challenge Mode runbook.)*
