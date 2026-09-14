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

---

## Phase 2 — Abuse resistance and DDoS mitigation

Read this before touching the numbers below: **nothing here prevents a DDoS.**
A large enough flood overwhelms any origin, on any plan. What this phase does
is raise the cost of attacking, keep as much traffic as possible off the
database and off your own functions, and cap the bill when an attack happens
anyway. It's risk reduction, not immunity.

### This project is on Vercel **Hobby**

Confirmed with the user. Hobby gets **one** rate-limit rule per project (plus
three custom firewall rules total), 1,000,000 included allowed requests,
IP or JA4-digest keying, fixed-window algorithm, 10s–10min window. Counters
are **per region** — traffic spread across regions can exceed the configured
limit in aggregate, so the number below has headroom built in for that.

### Task 2.2 — the one WAF rate-limit rule

With only one rule available, it protects the expensive **write** paths, not
the catalog (Task 5's caching work is what protects the catalog). Apply in
**Log** action first, watch Firewall → Overview for a day of real traffic
patterns, then switch to **Deny**.

| Rule | Condition | Window | Limit | Key | Action (start → steady state) |
|---|---|---|---|---|---|
| Write-path throttle | Path starts with `/api/` OR path equals `/register` | 60s | 60 requests | IP | Log → Deny |

Why this shape: `/api/*` already covers PayPal capture, the demo-checkout
fallback, the webhook, and NextAuth's credentials callback
(`/api/auth/callback/credentials`, i.e. sign-in). `/register` is a Server
Action, which POSTs to the page URL it's called from, not a `/api/*` route,
so it needs naming explicitly. The catalog (`/products*`) and everything
under `(shop)` is deliberately **not** matched — Hobby's single rule has to
be spent on the paths that cost money or CPU per request, and the catalog's
real fix is caching (Task 5.2), not rate limiting.

If the project ever moves to Pro (40 rules), split this into the full table
from `CLAUDE-CODE-TASKS.md` §2.2 — sign-in, registration, capture, and
demo-checkout each keyed and limited separately, plus a `/products*`
Challenge rule as defense in depth on top of the CDN caching.

**Configured in Vercel dashboard → Project → Firewall → Configure → New
Rule → Publish. Not in this repository, not version-controlled, and it
drifts silently from this table if changed there — re-sync this file by
hand if the dashboard rule changes.**

### Task 2.3 — application-level rate limiting

Done in code — see `src/lib/rate-limit.ts` and its call sites. This is the
second layer: the WAF above is per-IP/per-region and can't express "five
failed attempts for *this account*"; the application layer buckets by
account or cart instead.

- Uses `@vercel/firewall`'s `checkRateLimit()`, which needs a **matching
  rate-limit rule created in the dashboard** carrying the `@vercel/firewall`
  condition and the rate-limit ID used in code. Until that dashboard rule
  exists, `checkRateLimit()` fails (network/config error) — and per the
  brief's explicit instruction, a limiter that can't reach its backing rule
  **fails open**, so the app keeps working with no limiting rather than
  taking checkout offline. **This means Task 2.3 has no real effect until
  the dashboard rule below is created.**

| Rate-limit ID (used in code) | Suggested limit | Key |
|---|---|---|
| `auth-attempt` | 10 / 60s | `login:<lowercased email>` |
| `register-attempt` | 5 / 600s | IP |
| `paypal-capture` | 20 / 60s | IP |
| `demo-checkout` | 10 / 60s | IP |

Create each as a Firewall rule with the `@vercel/firewall` condition
(Vercel dashboard → Firewall → Configure → New Rule → Rate Limit →
"Algorithm: Application-Managed" or equivalent for the installed SDK
version — the exact UI label may differ; look for the option tied to
`@vercel/firewall`'s `checkRateLimit`) using the matching ID from the table.

### Task 2.4 — email-enumeration message: left as-is (user decision)

`registerUser` still returns "An account with that email already exists."
**Decision, discussed with the user:** leave it. Task 2.3's per-account
rate limit already makes mass enumeration expensive, and for a demo
storefront with no real user base to protect, a clear signup error
outweighs closing this oracle. Revisit if this ever handles real user data —
the fix is a generic success-style response plus (out of scope here, no
email sending is wired up) a "someone tried to register with your address"
notice to the real owner.

### Task 5.6 — oversell/restock fix: chosen (see Phase 5 section below)

**Decision, discussed with the user:** record the actual quantity
decremented rather than refusing to settle on insufficient stock — never
rejects money PayPal already captured. Implemented in Phase 5.

---

## Phase 3 — Blast radius and cost control

### Task 3.2 — spend and usage caps (dashboard-only)

- [ ] Vercel → Project → Settings → Billing (or the team's Billing page) →
      set a spend/usage limit.
- [ ] Enable usage notifications so an absorbed attack shows up as an alert,
      not a surprise invoice.

### Task 3.3 — incident runbook

**If the site is under unusual load or a suspected attack:**

1. **Look**: Vercel dashboard → Firewall → Overview, grouped by the custom
   rule from Task 2.2, to see what's actually being hit and from where.
2. **Emergency lever**: Firewall → **Attack Challenge Mode** — a one-click
   toggle that challenges *all* incoming traffic. Free on every plan.
   Degrades the experience for real visitors (they see a challenge page), so
   treat it as a minutes-to-hours tool, not a setting to leave on.
3. **Follow-up**: once Overview shows where traffic is concentrated, IP and
   country blocking (Firewall → Configure) are free on all plans and are the
   targeted alternative to leaving Challenge Mode on indefinitely.
4. **Confirm the database survived**: `GET /api/health` with the
   `x-health-token` header (see above), and check the Postgres provider's own
   connection-count graph (Neon dashboard, if that's where production lives).
5. **Before un-mitigating, capture evidence**: screenshot the Firewall
   Overview traffic breakdown and note timestamps, so the incident can be
   reviewed afterwards — this is also what you'd hand to Vercel support or
   use to justify a plan/rule change.
6. **Who to contact**: *(fill in — this repo doesn't know your on-call or
   support arrangement.)*

---

## Phase 4 — Scraping and reuse (Task 4.3)

`src/app/robots.ts` allows normal search crawlers and disallows
authenticated/action routes (`/admin`, `/orders`, `/cart`, `/checkout`,
`/api`) for everyone, plus — confirmed with the user — a block list of known
AI-training crawler user agents (GPTBot, CCBot, ClaudeBot, Google-Extended,
and others; see the file for the full list). **This is a request, not
enforcement**: a well-behaved crawler honors `robots.txt`, a badly-behaved
one ignores it entirely. The one thing that actually *prevents* a form of
reuse is `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` from Task
1.5, which stops the site being framed into someone else's page at the
browser level regardless of what any crawler chooses to respect.

**Explicitly not implemented, and won't be if asked**: right-click blocking,
text-selection blocking, or similar client-side "protection". It doesn't
stop copying (view-source, network tab, and save-as all bypass it trivially),
it breaks accessibility and keyboard use, and it reads as broken rather than
protected.

**Optional dashboard addition** (not applied, free on all Vercel plans):
Firewall → Configure → a custom rule blocking known scraper user agents,
alongside the Task 2.2 rule.

---

## Dashboard checklist (cannot be done from this repo)

- [ ] Set `HEALTH_TOKEN` in Vercel → Project → Settings → Environment
      Variables (Production, and Preview if used).
- [ ] Verify the CSP per the walkthrough above, then set `CSP_ENFORCE=1`.
- [ ] Create the Task 2.2 WAF rate-limit rule (Hobby: the one write-path
      rule above). Start in Log, confirm no false positives, switch to Deny.
- [ ] Create the four Task 2.3 `@vercel/firewall` rules so
      `checkRateLimit()` in the app actually limits anything.
- [ ] Set a spend/usage cap and enable usage notifications (Task 3.2).
- [ ] Fill in the "who to contact" line in the incident runbook above.
- [ ] Optional: a Firewall rule blocking known scraper user agents (Task 4.3).
- [ ] *(Phase 4 adds license/legal items here.)*
