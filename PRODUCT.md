# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase, not a user decision: Next.js 16 (App Router, Turbopack), React 19,
Drizzle ORM on Postgres, Auth.js v5 (JWT sessions, Credentials + optional Google),
Tailwind v4, shadcn "base-nova" style on Base UI primitives. Payments are PayPal
Orders v2 (sandbox in dev); the dev database is local Docker Postgres. See
[store/CLAUDE.md](store/CLAUDE.md) for architecture conventions that constrain UI work
(Server Actions return `ActionResult` rather than throwing; money is always integer
cents; catalog filters live in the URL query string; build-time pages must not touch
the DB).

## Users

Two audiences, both served by this one app:

- **Shoppers** — audio engineers, producers, and studio owners buying monitoring gear
  (studio monitors, headphones, EQ/DSP, amplifiers & interfaces, cables & accessories).
  They are technical about sound, skeptical of marketing hype, and evaluate gear on
  measured accuracy rather than brand excitement. They browse a catalog, filter and
  search, compare variants (size / finish / length), and check out as guest or
  account holder.
- **Store operator (admin)** — a single role that manages the catalog (products,
  variants, stock, pricing, featured flags) and works orders through their lifecycle
  (`pending` → `paid` → `fulfilled`, or `cancelled`) from the `/admin` dashboard.

Design priority is the shopper-facing storefront first, then the admin dashboard;
both are in scope.

## Product Purpose

"Acoustic Ledger" is a storefront for neutral, reference-grade studio audio equipment —
gear chosen and described for honest reproduction, not flattering coloration. Success
for a shopper is leaving confident they picked the right tool for a specific job
(a room, a mix stage, a tracking chain). Success for the operator is keeping the
catalog accurate and moving orders to fulfilled without the storefront ever overselling
stock.

This repository is a **portfolio / showcase build** demonstrating a complete,
production-shaped e-commerce implementation (catalog, cart, guest + account checkout,
provider-agnostic settlement with idempotent stock decrement, admin tooling, auth,
deploy runbook). The catalog brand and its products are fictional and exist to make
the storefront concrete; the engineering is the thing being shown.

## Positioning

The catalog's own claim: every product is voiced or built to be transparent — monitors
flat within a stated tolerance, headphones tuned to one target curve so switching
between models doesn't change your read on a mix, preamps and interfaces that "stay out
of the way of the signal." The differentiator a hype-driven competitor could not
truthfully copy is the restraint: deliberately un-boosted low end, tradeoffs stated
plainly in the product copy, "not a bass monster."

As a showcase project, the differentiator is that the checkout and settlement path is
built correctly — amounts always recomputed from the database, capture/webhook race
resolved by a conditional single-winner `UPDATE`, order line items snapshotted so
catalog edits never rewrite order history.

## Operating Context

- **Storefront flows:** home (hero + featured) → catalog (`q`, `category`, `min`,
  `max`, `sort` in the URL; Postgres full-text search on a `tsvector` column) →
  product detail (image gallery, variant picker, stock-aware add-to-cart) → cart →
  checkout (PayPal buttons, or a fenced demo-checkout fallback for live demos) →
  checkout success (order-status poller) → order history.
- **Cart ownership:** exactly one owner — a signed-in user or a guest (httpOnly
  `cart_session` cookie); the guest cart folds into the user cart on sign-in.
- **Admin flows:** dashboard overview → products list → product create / edit (with
  inline variant editor) ; orders list → order detail with status actions.
- **Auth:** email/password (seeded `admin@demo.test` / `customer@demo.test`), optional
  Google OAuth when configured. `role` (`customer` | `admin`) rides on the JWT.
  Authorization is defense-in-depth: path gating in `proxy.ts` plus `requireAdmin()` /
  `adminGuard()` on the protected thing itself.
- **Money:** integer cents everywhere; decimal strings only at the PayPal boundary.
- **Deployment target:** Vercel (Root Directory `store`) + Neon Postgres in production;
  everything runs on free tiers. See [DEPLOY.md](DEPLOY.md).

## Capabilities and Constraints

- Catalog: 5 categories, ~38 products, most with 1–4 variants differing by size,
  finish, or cable length. Stock is per-variant and can be 0 (out-of-stock states are
  real and must be designed).
- Product imagery: 12 shared placeholder `.webp` files in
  [store/public/products/](store/public/products/), reused across many products — there
  is no per-product photography. Real or generated per-product imagery is an open asset
  gap, not something to fake in copy.
- Order statuses: `pending`, `paid`, `fulfilled`, `cancelled`. Guest orders have no
  `user_id`, only an email.
- Shipping: free over $100, otherwise a flat fee (`shippingForSubtotal`).
- No test framework; verification is `npm run lint` + `npm run build` + diagnostic
  scripts + manual smoke test.
- Builds must not touch the database — new prerendered pages must stay DB-free.
- Light theme only is currently wired end-to-end; a `.dark` token block exists in
  `globals.css` but is monochrome placeholder and not exercised.

## Brand Commitments

Confirmed as binding (name + voice preserved; the visual world is open to redesign):

- **Name:** "Acoustic Ledger", currently set as a mono, uppercase, wide-tracked
  wordmark (no logo mark).
- **Voice:** plain, technical, anti-hype. States tradeoffs directly ("trades isolation
  for a more natural stereo image"), avoids superlatives, treats the reader as an
  expert. Headline in use: "High-fidelity gear, tuned to tell you the truth."
- **Honesty framing:** the storefront openly identifies as a demo where it matters —
  the footer line "Demo store. Payments run in the PayPal sandbox — no real charges."
  must remain (or an equivalent) while this is a showcase.

**Not** binding / open to replacement: the current warm-paper palette
(`#f3efe7` / `#232019` / rust `#b3703b`), Geist Sans + Geist Mono, `--radius: 0.25rem`,
and the overall minimalist editorial layout. Treat the present look as evidence and
anti-reference, not a starting point, when a redesign is requested.

## Evidence on Hand

- Real: the full product catalog with detailed, internally consistent spec copy
  (`store/src/db/seed.ts`); 12 placeholder product photos; seeded demo orders and two
  demo logins; a working PayPal sandbox integration; a written deploy runbook
  ([DEPLOY.md](DEPLOY.md), [PAYPAL_SETUP.md](PAYPAL_SETUP.md)).
- Absent — must not be fabricated: customer testimonials, reviews, ratings, press
  quotes, sales figures, "trusted by" logos, measurement graphs / frequency-response
  plots, founder or company story, physical address, real support channels. The brand
  and its products are fictional; any proof element added to a page has to be visibly
  illustrative, not presented as real.

## Product Principles

1. **Accuracy over excitement.** Every design and copy choice should feel like it comes
   from people who distrust hype — the restraint is the brand.
2. **The catalog is the product.** Shoppers come to evaluate specific gear against
   specific jobs; make specs, variants, and stock state legible before anything
   expressive.
3. **Never oversell.** Stock, pricing, and totals are always computed server-side from
   the database; the UI must reflect real availability including zero.
4. **Guest and account are equal paths.** Checkout must not privilege signed-in users;
   the guest cart is first-class.
5. **Honest about being a demo.** While this is a showcase, the storefront says so
   plainly rather than pretending to be a live business.

## Accessibility & Inclusion

No formal standard was set. Baseline expectation: keyboard-operable catalog filtering,
cart, and checkout; visible focus states; form errors surfaced as readable text (the
`ActionResult` convention exists partly for this); sufficient contrast in whatever
palette a redesign adopts. Out-of-stock and disabled states must not rely on color
alone.
