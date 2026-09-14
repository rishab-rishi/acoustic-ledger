# Hardening brief — Acoustic Ledger (`store/`)

**For:** Claude Code, run from the repository root.
**Scope:** the Next.js app in `store/`. Vercel is the deploy target (project Root
Directory is `store`).
**Source:** findings from a verified review on 14 Sep 2026 (`REVIEW-2026-09-14.md`),
plus abuse-resistance and IP-posture work requested afterwards.

---

## Read this before you start

### Ground rules

1. **Work phase by phase, in order.** Phases 1–3 are security and must land
   first. Do not start a later phase until the current one passes verification.
2. **Verify after every phase:**
   ```
   cd store
   npm run lint && npx tsc --noEmit && npm test && npm run build
   ```
   All four must pass. `npm test` needs the Docker Postgres from the repo root
   (`docker compose up -d`, listens on **5433**). `tsc` reports
   `Cannot find name 'LayoutProps'` on a tree with no `.next/` — run the build
   first, those are Next's generated route types.
3. **One commit per numbered task**, message describing the behaviour change.
   Do not squash security fixes together — they need to be revertable
   individually.
4. **Add a test for every behaviour change** where the logic is testable without
   a browser. The suite is Vitest: unit tests live beside their source as
   `src/**/*.test.ts`, integration tests needing Postgres live in `tests/`.
   Existing files show the house style — read `src/lib/paypal.test.ts` and
   `tests/settle-order.test.ts` before writing new ones.
5. **Do not touch `settleOrder()`'s status-transition logic.** The conditional
   `UPDATE ... WHERE status = 'pending'` is load-bearing and verified correct by
   `tests/settle-order.test.ts` and `scripts/verify-settlement.ts`. If a task
   seems to require changing it, stop and ask.
6. **Read `CLAUDE.md` at the repo root first.** It documents conventions that
   are not obvious from the code — integer cents everywhere, `ActionResult`
   instead of thrown errors, build-time DB access rules, and the fact that this
   is Next.js 16 where `middleware` is now `proxy.ts`.
7. **Next.js 16 is newer than your training data.** Before writing framework
   code, check `store/node_modules/next/dist/docs/` for the relevant guide.
8. **Never commit a real secret.** `.env*` is gitignored except `.env.example`.
   New environment variables go in `.env.example` with an empty value and a
   comment, and in `DEPLOY.md`.

### Two things in this brief cannot be done as asked

The request that prompted this file asked to make the site impossible to
copyright-claim and impossible to DDoS. Neither is achievable by anyone, and you
should not write code that implies otherwise or claim in a commit message,
comment, or summary that either has been achieved.

- **Copyright claims cannot be prevented.** Anyone can file a takedown or a
  claim against any site at any time, regardless of what the code does. What
  Phase 4 does instead is (a) reduce the chance a claim against you would be
  *valid*, by auditing what the site actually ships, and (b) make your own
  ownership provable, so a claim is cheap to rebut and copying is easy to prove.
- **DDoS cannot be prevented, only absorbed.** A large enough flood overwhelms
  any origin. What Phases 2–3 do is raise the cost of attacking, push traffic
  onto the CDN instead of the database, and cap the damage — both downtime and
  the bill — when it happens anyway.

Implement both as risk reduction. Say so plainly in the summary at the end.

---

## Phase 0 — Baseline

**Task 0.1 — Record the starting state.**

```
cd store
npm ci
npm run lint; npx tsc --noEmit; npm test; npm run build; npm audit --json > /tmp/audit-before.json
```

Note the route table from the build output — Phase 5 changes it and you will
want the before/after.

**Task 0.2 — Confirm whether secrets were ever committed.**

```
git ls-files store/.env.local store/.env.prod.local
git log --all --oneline -- store/.env.local
```

If either file is or was tracked, **stop and report to the user before doing
anything else.** `AUTH_SECRET` in history means anyone with the repo can forge a
session JWT with `role: "admin"` against any deployment reusing that value. The
fix is rotation plus history rewrite, and that is the user's call, not yours.

Whether or not it was committed, fix the documentation: `CLAUDE.md` line ~56
claims "`.env.local` is committed (it holds sandbox-only secrets)" but
`store/.gitignore` contains `.env*` with only `!.env.example` excepted. The
statement is wrong and invites the next person to commit a live secret. Correct
it to describe what the gitignore actually does.

---

## Phase 1 — Critical security

### Task 1.1 — Patch the dependency vulnerabilities

`next@16.3.0` carries two unauthenticated RCE advisories, one rated critical:

- GHSA-p293-qw3h-jr36 — unauthenticated RCE on Windows-hosted servers
- GHSA-2xp9-vwfh-vxw4 — unauthenticated RCE in the Image Optimization API when
  AVIF files are used

Both affect `next` 16.0.0 through 16.3.2.

```
cd store
npm i next@^16.3.5 eslint-config-next@^16.3.5
npm audit fix        # clears fast-uri, js-yaml, sharp, hono, qs — no breaking changes
npm audit
```

Do **not** run `npm audit fix --force`. It will downgrade `drizzle-kit` to
0.18.1, which is a breaking change for this schema. The remaining `esbuild`
advisory reached through `drizzle-kit` is a dev-server issue in a build-time-only
dependency — leave it and note it.

**Acceptance:** `npm audit` reports no critical or high advisories outside the
`drizzle-kit` → `@esbuild-kit` chain. Build and tests still pass.

### Task 1.2 — Gate `/api/health`

`src/app/api/health/route.ts` is unauthenticated and returns the database host,
the Vercel region, which Neon-style environment variable names are present, and
on failure the raw Postgres driver error message and code. That is a free map of
the infrastructure.

Change it so:

- With no `x-health-token` header matching `process.env.HEALTH_TOKEN`, return a
  minimal `{ ok: true | false }` with no `env` and no `db` block, and status 200
  or 503.
- With a matching token, return the current detailed body.
- If `HEALTH_TOKEN` is unset, serve only the minimal body — never fall open to
  the detailed one.

Add `HEALTH_TOKEN=` to `.env.example` with a comment, and document it in
`DEPLOY.md`.

**Also fix the connection leak in the same file.** The handler currently does
`new Pool(...)` per request and `pool.end()` in `finally`. Under any flood this
opens a new Postgres connection per request and will exhaust `max_connections`,
taking the entire site down — not just the health endpoint. Reuse the shared
`db` from `@/db` instead of constructing a Pool. If the raw `pg` query is needed
for the diagnostic, hold a module-scoped Pool with `max: 1` rather than one per
request.

**Acceptance:** an unauthenticated `GET /api/health` response body contains no
hostname, no region, no environment variable names and no driver error text. The
route creates no new connection per request.

### Task 1.3 — Set `Secure` on the cart cookie

`src/lib/cart.ts`, in `getOrCreateCartId()`:

```ts
(await cookies()).set(CART_COOKIE, newToken, {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: THIRTY_DAYS,
});
```

Without it, the guest cart token travels in clear text over any plain-HTTP hop
and can be replayed to read or mutate that cart. Keep the environment check so
local HTTP development still works.

**Acceptance:** in a production build the `Set-Cookie` header for `cart_session`
includes `Secure`, `HttpOnly` and `SameSite=Lax`.

### Task 1.4 — Tighten the sandbox whitelist

`isSandboxPaypal()` in `src/lib/demo-checkout.ts` uses
`base.includes("sandbox.paypal.com")`, which would accept
`https://evil.example.com/sandbox.paypal.com`. It is an environment variable so
it is not attacker-controlled, but the entire purpose of that function is to be
a whitelist that cannot be tricked. Parse the URL and compare the hostname
exactly:

```ts
function isSandboxPaypal(): boolean {
  try {
    const base = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";
    return new URL(base).hostname === "api-m.sandbox.paypal.com";
  } catch {
    return false; // unparseable counts as live
  }
}
```

`src/lib/demo-checkout.test.ts` already covers the fencing. Add a case for the
path-injection string above and for an unparseable value.

**Acceptance:** all existing demo-checkout tests still pass, plus the two new
cases.

### Task 1.5 — Add a security headers policy

There is no CSP, HSTS or framing policy anywhere in the tree. Add them in
`store/next.config.ts` via the `headers()` config, applied to all routes:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` and `frame-ancestors 'none'` in the CSP — this also
  blocks clickjacking and stops the storefront being iframed into somebody
  else's site, which matters for Phase 4
- `Permissions-Policy` denying camera, microphone and geolocation
- A `Content-Security-Policy`

The CSP is the hard part because of PayPal. Build it up rather than guessing:
the PayPal JS SDK needs `script-src` and `frame-src` entries for
`*.paypal.com` and `*.paypalobjects.com`, and the checkout flow opens a PayPal
iframe. Next's inline bootstrap needs a nonce or `'strict-dynamic'`.

**Ship the CSP in `Content-Security-Policy-Report-Only` first**, verify a full
sandbox checkout produces no violations in the browser console, then switch to
enforcing. Do not enforce a CSP you have not watched a real checkout pass under —
a broken CSP silently kills payments.

**Acceptance:** headers present on every response; a full add-to-cart →
PayPal sandbox checkout → confirmation flow completes with zero CSP violations
reported.

---

## Phase 2 — Abuse resistance and DDoS mitigation

Nothing in this repository is rate limited today — confirmed by grep. Read the
honest-framing note above before starting: the goal is absorbing and capping,
not immunity.

### Task 2.1 — Understand this app's actual exposure first

Do not start writing limits until you have read these three facts out of the
code, because they determine where the limits belong:

1. **Every route builds as dynamic (`ƒ`).** Nothing is cached. Every single
   request to `/products` reaches Postgres. A flood of
   `/products?q=<random>` cannot be served from any cache and goes straight to
   the database. This is the single largest exposure and Phase 5 addresses the
   root cause.
2. **`POST /api/paypal/capture` is unauthenticated and makes an outbound PayPal
   API call per request.** An attacker can burn your PayPal API quota, your
   function execution budget, and your bill without ever touching the database.
3. **The credentials provider runs bcrypt at cost 10 per attempt.** That is
   deliberate CPU cost, which makes the sign-in endpoint an amplification
   target: a cheap request for the attacker, an expensive one for you.

### Task 2.2 — Edge rate limiting at the Vercel WAF

This is the layer that matters most, because WAF-mitigated traffic never reaches
your functions and does **not** incur CDN Requests or Fast Data Transfer
charges. It is the difference between an attack that costs you nothing and one
that costs you money.

Note the plan limits before designing rules: on **Hobby** you get **one** rate
limit rule per project (and three custom firewall rules total, 1,000,000
included allowed requests); on **Pro**, forty rules, usage-based. Counting keys
available on both are IP and JA4 digest; the algorithm is fixed window; the
window is 10s minimum, 10 minutes maximum. **Counters are per-region**, so
traffic spread across regions can exceed the configured limit in aggregate —
set limits with that headroom in mind.

Ask the user which plan the project is on before designing the ruleset. If it is
Hobby, the single rule should protect the most expensive path — write endpoints
(`/api/*` plus the sign-in and registration POSTs), not the catalog.

For a Pro project, propose roughly:

| Path | Limit | Key | Action |
|---|---|---|---|
| `POST /api/auth/*` (sign-in) | 10 / 60s | IP | Challenge |
| Registration POST | 5 / 600s | IP | Deny |
| `POST /api/paypal/capture` | 20 / 60s | IP | Deny |
| `POST /api/demo/checkout` | 10 / 60s | IP | Deny |
| `/products*` | 300 / 60s | IP | Challenge |

Ship each rule in **Log** action first and watch the Firewall overview for false
positives before switching to Deny or Challenge. A rate limit that blocks real
customers mid-checkout is worse than the attack it prevents.

These rules are configured in the Vercel dashboard (Project → Firewall →
Configure → New Rule → Publish), not in this repository. **You cannot create
them.** Write the exact intended ruleset into a new `SECURITY.md` — one row per
rule with path, condition, window, limit, key and action — so the user can apply
it, and so it is reviewable and reproducible. Note in that file that dashboard
rules are not in version control and drift silently.

### Task 2.3 — Application-level rate limiting

The WAF is the outer wall; it is per-region and IP-keyed, so it cannot express
"five failed password attempts for *this account*". Add a second layer in code.

Use `@vercel/firewall`'s `checkRateLimit()`, which ties into the same WAF
infrastructure and supports a custom `rateLimitKey` — so you can bucket by
account rather than by IP:

```ts
import { checkRateLimit } from "@vercel/firewall";

const { rateLimited } = await checkRateLimit("auth-attempt", {
  request,
  rateLimitKey: `login:${email.toLowerCase()}`,
});
```

This requires a matching rule created in the dashboard with the
`@vercel/firewall` condition and that rate limit ID — document the required IDs
in `SECURITY.md` alongside the rules from 2.2.

Note the trap in the docs: passing a `rateLimitKey` **replaces** the per-IP
bucket entirely. If you want per-IP *and* per-account separation, compose the
key yourself with a delimiter that cannot appear in either value.

Apply it to:

- **`registerUser`** (`src/actions/auth.ts`) — keyed on IP. Unlimited account
  creation is both a spam vector and a database-growth vector.
- **Credentials sign-in** (`authorize` in `src/auth.ts`) — keyed on the
  lowercased email, so distributed guessing against one account is caught even
  from many IPs. Return `null` on limit, exactly as a wrong password does, so
  the limit itself is not an oracle.
- **`POST /api/paypal/capture`** — keyed on IP, before the PayPal fetch, so a
  blocked request costs you nothing outbound.
- **`POST /api/demo/checkout`** — keyed on IP.

If the user would rather not depend on Vercel here, `@upstash/ratelimit` with
Upstash Redis is the portable equivalent and works the same way. Ask before
adding a new hosted dependency.

**Behaviour requirements:**

- Server Actions must return `{ ok: false, error: ... }` — never throw. Next
  redacts thrown Action errors to a generic digest in production. This is a
  documented convention in `CLAUDE.md`; follow it.
- Route handlers return HTTP 429 with a `Retry-After` header.
- A rate limiter that is unreachable (Redis down, WAF unavailable) must **fail
  open**, not closed. Log the failure and allow the request. Taking your own
  checkout offline because a limiter had a bad minute is a self-inflicted
  outage. Make this explicit in a comment so nobody "fixes" it later.

**Tests:** the limiter is an external call, so mock it. Assert that a limited
registration returns the `ActionResult` error shape rather than throwing, that a
limited capture returns 429 **without** calling PayPal, that a limited sign-in
returns `null` indistinguishably from a bad password, and that a limiter which
throws still lets the request through.

### Task 2.4 — Close the email-enumeration oracle

`registerUser` returns "An account with that email already exists", which turns
the endpoint into a membership check for any address. Combined with 2.3's limit
this is much less useful to an attacker, but fix the shape too: return a
generic success-style result and, in a real deployment, send a "someone tried to
register with your address" email instead.

Discuss with the user first — this trades a small security gain for a worse
signup experience, and for a demo storefront it may not be worth it. If they
decline, leave it and note the decision in `SECURITY.md`.

### Task 2.5 — Make `registerUser` race-safe

It currently does read-then-insert. The unique index on `user.email` keeps it
correct, but the loser of a race gets "Couldn't create your account. Try again."
instead of the accurate message. Catch the Postgres unique-violation code
(`23505`) and return the same result the duplicate-check path returns.

---

## Phase 3 — Blast radius and cost control

An attack you absorb technically can still hurt you financially. These tasks cap
the damage.

### Task 3.1 — Bound the database connection pool

`src/db/index.ts` creates `new Pool({ connectionString })` with no `max`. Each
serverless instance gets its own pool, and under load Vercel spawns many
instances — so the real connection count is `instances × pool max`, which will
exhaust Postgres `max_connections` long before the functions themselves fall
over. When that happens every page 500s, including pages that would otherwise
have been cached.

Set an explicit small `max` (1–2 is right for serverless) and a
`connectionTimeoutMillis` so a request fails fast instead of hanging. If the
production database is Neon, confirm the deployment uses the **pooled**
connection string — the health endpoint already reports `pooled` by checking for
`-pooler` in the host, which is a hint the distinction has bitten before.

### Task 3.2 — Add spend and usage caps

In the Vercel dashboard: set a spend limit on the project, and enable usage
notifications. Without a cap, an absorbed attack is an unbounded invoice.

You cannot set these; list them as a checklist in `SECURITY.md` for the user.

### Task 3.3 — Write an incident runbook

Add a short "Under attack" section to `SECURITY.md`:

- Where to look: Vercel dashboard → Firewall overview, grouped by the custom
  rule, to see what is actually being hit.
- The emergency lever: **Attack Challenge Mode**, a dashboard toggle that
  challenges all traffic. It is free on every plan. Note that it degrades the
  experience for real users, so it is a minutes-to-hours tool, not a setting.
- IP and country blocking are also free on all plans and are the right follow-up
  once the Firewall overview shows where traffic is coming from.
- Confirm the database survived: `/api/health` with the token, plus Postgres
  connection count.
- Who to contact and what to capture before mitigating (screenshots of the
  traffic grouping, timestamps) so the incident can be reviewed afterwards.

---

## Phase 4 — Intellectual property posture

Re-read the framing note: this cannot make the site immune to copyright claims.
It splits into reducing the chance a claim against you is valid, and making your
own ownership provable.

### Task 4.1 — Audit what the site actually ships

This is the half that genuinely reduces legal risk, and it is an audit, not a
code change. Produce a findings table in a new `store/ATTRIBUTION.md`.

Check every asset and every string:

- **Product images** — `store/public/products/*.webp`, 13 files. They appear to
  be generated by `scripts/generate-images.ts`. Read that script and determine
  exactly how: if it calls a third-party image service or model, record which
  one and what its output licence and commercial-use terms say. If any image
  came from a stock site or a search result, it must be replaced. Record the
  provenance of each file.
- **Fonts** — `src/app/layout.tsx` loads Saira, Saira Condensed and JetBrains
  Mono via `next/font/google`. Confirm and record each licence (these are
  normally SIL OFL or Apache 2.0, which are fine commercially, but verify rather
  than assume) and that `next/font` self-hosting satisfies the licence.
- **Seed data** — `src/db/seed.ts` is 32KB of catalog copy. Verify every product
  name, description and brand is invented. "Acoustic Ledger" and the product
  names looked fictional on review, but confirm none of them collide with a real
  audio manufacturer's trademark. A real brand name on a fake product is the
  most likely source of an actual complaint against this site.
- **Dependencies** — run `npx license-checker --summary` (or equivalent) and
  record anything that is not MIT/ISC/Apache-2.0/BSD. Flag any copyleft licence
  for the user's attention.
- **UI components** — `src/components/ui/` is shadcn over Base UI. Record the
  licences and confirm any required notices are satisfied.

Anything that cannot be traced to a clear licence gets flagged in the table with
a recommendation to replace it. Do not silently assume an asset is fine.

### Task 4.2 — Establish and mark ownership

- Add a `LICENSE` file at the repository root. Ask the user which licence they
  want — this is their decision, not yours. For a client demo that should not be
  reused, "All rights reserved" with an explicit copyright line is the usual
  choice; for a portfolio piece they want others to learn from, MIT. **Do not
  pick one for them.**
- Add a copyright line to `src/components/shop/footer.tsx` — `© 2026 <owner>` —
  with the year derived at render rather than hardcoded.
- Add the owner to the site metadata in `src/app/layout.tsx` (the `authors` and
  `creator` fields of the Next `Metadata` object).
- Ask the user whether they want a Terms of Use and a Privacy Policy page. A
  storefront that takes email addresses and processes payments generally needs
  both, and their absence is a more realistic legal exposure than copying is.
  If yes, scaffold the routes under `(shop)` with clearly marked placeholder
  copy — and state plainly in the page and in your summary that placeholder
  legal text is not legal advice and needs a lawyer's review before the site
  handles real orders.

### Task 4.3 — Control scraping and reuse

- Add `store/public/robots.txt` (or a `robots.ts` route). Allow normal search
  crawlers; decide with the user whether to disallow AI training crawlers
  (`GPTBot`, `CCBot`, `ClaudeBot`, `Google-Extended` and similar). This is a
  request, not enforcement — well-behaved crawlers honour it and badly-behaved
  ones ignore it. Say that rather than implying it blocks anything.
- `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` from Task 1.5 stop
  the site being embedded in someone else's page, which is the one form of
  reuse a header can actually prevent.
- For the Vercel Firewall, a rule blocking known scraper user agents is
  available and free (custom rules are free on all plans). Add it to the
  `SECURITY.md` ruleset as optional.
- **Do not** implement right-click blocking, text-selection blocking, or any
  similar client-side "protection". It does not stop copying, it breaks
  accessibility and keyboard navigation, and it makes the site feel broken. If
  asked for it, explain why and decline.

### Task 4.4 — Make copying provable

Provenance is what actually wins a dispute. Practical, low-cost measures:

- The git history is already the strongest evidence of authorship — dated,
  incremental, attributable. Note in `ATTRIBUTION.md` that it should be
  preserved and not squashed away.
- If the user wants stronger proof, a couple of unique invented strings in the
  markup (a fake internal component name, a distinctive comment) make wholesale
  copying trivially demonstrable. Keep them invisible to users and harmless.
  Only add these if the user asks — do not put mystery strings in their codebase
  unannounced.

---

## Phase 5 — Correctness and scale

These are from the review. They are not security fixes, but 5.1 and 5.2 directly
reduce DDoS exposure by moving traffic off the database, so they belong here
rather than at the end.

### Task 5.1 — Paginate the catalog

`searchProducts()` in `src/db/queries.ts` has no `limit` or `offset`, and
`app/(shop)/products/(catalog)/page.tsx` renders every row it returns along with
each row's variants. At 38 seeded products this is invisible. At 2,000 it is a
multi-megabyte RSC payload, and it is an attacker's cheapest way to make one
request cost you a full table scan and a large response.

- Add `limit` and `offset` to `SearchParams`, and return a total count for the
  pager.
- Put `page` in the query string next to `q`/`category`/`min`/`max`/`sort` — add
  it to `CATALOG_KEYS` in `src/lib/catalog-url.ts`, which gives shareable and
  back-button-correct paginated URLs for free. `src/lib/catalog-url.test.ts`
  will need cases for the new key.
- **Cap the page size server-side.** A hand-typed `?limit=100000` must clamp to
  the maximum, not honour it. This is the security-relevant half of this task —
  do not skip it.

### Task 5.2 — Cache the public pages

Every route builds as `ƒ (Dynamic)`. Correct for `/cart`, `/orders`, `/admin/*`
and the API — wrong for the catalog and product pages, which are public,
identical for every visitor, and change only when an admin edits the catalog.

Serving those from the CDN is both a large performance win and the most
effective DDoS mitigation available, because cached responses never reach your
functions or your database at all.

- Give `/products` and `/products/[slug]` a `revalidate`, or better, cache tags
  invalidated by `revalidateTag()` from the admin product actions — they already
  call `revalidatePath`, so the invalidation points exist.
- Consider `generateStaticParams` on `/products/[slug]`.
- **Constraint from `CLAUDE.md`:** builds must not touch the database.
  `src/app/not-found.tsx` is `force-dynamic` specifically because the header and
  footer read categories. Respect that — either keep new prerendered pages
  DB-free or explicitly wire the database into the build, and say which you did.

### Task 5.3 — Index the foreign keys

Postgres does not index foreign keys automatically. Nine are unindexed,
confirmed against the seeded database:

```
account.userId        addresses.user_id       cart_items.variant_id
order_items.order_id  order_items.variant_id  orders.user_id
products.category_id  session.userId          variants.product_id
```

Four are on hot paths: `order_items.order_id` (every order view and every
settlement), `orders.user_id` (the whole `/orders` page), `variants.product_id`
(every catalog row's stock signal), `products.category_id` (the category
filter).

Add them to `src/db/schema.ts`, plus a composite `(status, created_at)` on
`orders` for the admin list, then `npm run db:generate` and `npm run db:migrate`.
Review the generated SQL before committing it.

### Task 5.4 — Make `createPendingOrder()` transactional

In `src/lib/pending-order.ts` the `orders` insert and the `orderItems` insert are
separate statements. If the second fails you get a `pending` order with no line
items; should it ever settle, `settleOrder()` finds no lines, decrements no
stock, and marks it paid. Wrap both in `db.transaction()`.

Add an integration test in `tests/` that asserts a failed line-item insert leaves
no order row behind.

### Task 5.5 — Stop orphaning pending orders

A new `pending` row is written on *every* click of the PayPal button. Abandoned
checkouts accumulate forever, inflate the admin order list, and give an attacker
a way to grow the database one click at a time.

Either reuse an existing `pending` order for the same cart when its contents
have not changed, or add a sweep of rows older than ~24 hours. Discuss which
with the user — the reuse approach interacts with the `PayPal-Request-Id`
idempotency header in `src/actions/checkout.ts` and needs care.

### Task 5.6 — Fix the oversell restock asymmetry

`settleOrder()` clamps with `greatest(stock - qty, 0)`, so an oversell floors
inventory at zero. `cancelOrder()` then restocks the **full** `line.qty`. Sell 5
units of a variant that had 1, then cancel, and stock reads 5 instead of 1 —
silent inventory corruption.

Either record the quantity actually decremented on the order item, or refuse to
settle when stock is insufficient rather than clamping. The first is safer; the
second changes payment behaviour and needs the user's sign-off, because it means
rejecting money that PayPal has already captured. **Ask before choosing.**

`tests/settle-order.test.ts` currently pins the clamping behaviour in the test
named "clamps stock at zero rather than going negative on an oversell". Update
it to match whichever decision is made.

### Task 5.7 — Small fixes

- **Cart item ordering.** `getCart()` in `src/lib/cart.ts` loads `items` with no
  `orderBy`, so row order is whatever Postgres returns and can reshuffle while
  someone edits quantities. Add `orderBy: asc(cartItems.createdAt)`.
- **Empty slugs.** `slugify()` in `src/lib/format.ts` returns `""` for input
  like `"!!!"`, which would hit the unique constraint on `products.slug` as a
  confusing database error. Validate for empty in the admin product action and
  return a field error. This is already pinned by a test in
  `src/lib/format.test.ts`.

---

## Final verification

```
cd store
npm run lint
npx tsc --noEmit
npm test
npm run build
npm audit
```

Then, against a seeded local database with `npm start`:

- `GET /api/health` **without** the token leaks nothing — no host, no region, no
  env var names, no driver errors.
- `GET /api/health` **with** the token returns the detailed body.
- `/`, `/products`, `/products/<slug>`, `/cart`, `/login`, `/register` return 200.
- `/orders`, `/admin`, `/admin/products`, `/admin/orders` return 307 when signed
  out.
- `/products/does-not-exist` and an unknown path return 404.
- `npx tsx scripts/verify-settlement.ts` reports ALL PASS.
- A full add-to-cart → PayPal sandbox checkout → confirmation flow completes
  with no CSP violations in the browser console.
- The build's route table shows `/products` and `/products/[slug]` are no longer
  plain dynamic.
- `Set-Cookie` for `cart_session` carries `Secure`, `HttpOnly`, `SameSite=Lax`.

## Report back

Write a summary covering:

1. What changed, per phase, with commit hashes.
2. **What you could not do** — every dashboard-only step (WAF rules, spend caps,
   Attack Challenge Mode) is the user's to apply, and `SECURITY.md` should list
   them as a checklist.
3. **Every decision you deferred** — licence choice, enumeration trade-off,
   oversell approach, pending-order strategy, AI-crawler policy.
4. **An honest statement of residual risk.** The site is harder to attack and
   cheaper to defend; it is not DDoS-proof and it is not immune to copyright
   claims. Say so in those words. Do not let a summary imply otherwise.
