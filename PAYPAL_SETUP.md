# PayPal setup (sandbox) — replaces Stripe

Everything here runs in the **PayPal sandbox**. No real money moves, no business
verification, no invite queue. Works from India. Takes about 20 minutes.

> **Why this replaces `STRIPE_SETUP.md`:** Stripe signup is invite-only in India
> and the dropdown asks where the business is *incorporated*, so there's no
> honest way through it without a non-India entity. PayPal's sandbox has no such
> gate. The server-side architecture — order state machine, webhook verification,
> idempotent stock decrement — ports over almost unchanged.

---

## Decision record

**2026-08-14 — payment provider changed from Stripe to PayPal.**

The build spec (§6) specified Stripe Checkout in test mode. During Phase 5 we hit
a hard external blocker: [Stripe accounts are invite-only in
India](https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india).
New signups must request an invite, which is aimed at businesses expanding
internationally and carries an unpredictable timeline. The country dropdown asks
for the country of *incorporation*, so there was no accurate way through it.

Options considered: request an invite (unpredictable, possibly declined for a
demo project); sign up under another country (only legitimate with a non-India
entity, which does not apply); build a local sandbox stub keeping the Stripe code
path; or move to PayPal.

PayPal was chosen because its sandbox is open to Indian developers with no
verification gate, and because the parts of §6 that carry the actual engineering
weight — server-computed amounts, webhook signature verification, idempotent
settlement that cannot double-decrement stock — all survive the move intact. What
changes is the provider call and the control flow shape (see *Migration notes*
below), not the architecture.

Stripe deviations to be aware of when reading the spec against this repo:
`§6` in `ECOMMERCE_DEMO_BUILD.md` describes the Stripe flow; the equivalents are
mapped in the file-by-file table below.

---

Environment variables needed in `store/.env.local`:

| Variable | Where it comes from | Looks like |
|---|---|---|
| `PAYPAL_CLIENT_ID` | Developer Dashboard → your app | `AZxK9...` |
| `PAYPAL_CLIENT_SECRET` | Developer Dashboard → your app | `EL8n2...` |
| `PAYPAL_WEBHOOK_ID` | Dashboard → app → Webhooks | `4XY12345AB678901C` |
| `PAYPAL_API_BASE` | fixed for sandbox | `https://api-m.sandbox.paypal.com` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | same as `PAYPAL_CLIENT_ID` | `AZxK9...` |
| `DEMO_CHECKOUT_FALLBACK` | optional, see *Demo fallback* below | `1` |

The client ID is public by design — the JS SDK needs it in the browser. Only
`PAYPAL_CLIENT_SECRET` is a real credential. It stays in `.env.local`, which is
gitignored. Don't paste it into chat, a commit, or a screenshot.

---

## Integration options

Pick one before writing code. They differ a lot in effort and in what they prove
to someone reviewing the portfolio.

### Option A — Standard Checkout, server-side create + capture — recommended

JS SDK renders PayPal buttons. Button click calls **your** server to create the
order; after the payer approves in the PayPal popup, your server captures it.

- Works in the sandbox immediately, no eligibility review
- Amounts and line items are computed server-side, so a tampered client can't
  change the price — this is the thing worth demonstrating
- Real webhook flow to build against
- Trade-off: the payment UI is PayPal's popup, not your own card form

### Option B — Standard Checkout, client-side capture only

The JS SDK's `actions.order.capture()` does everything in the browser.

- Fastest to get pixels on screen
- **Don't ship this in a portfolio.** Amounts originate client-side and there's
  no server-side verification. A reviewer who knows payments will read it as not
  understanding the trust boundary. Fine for a 10-minute spike, nothing more.

### Option C — Advanced (Expanded) Checkout with Card Fields

Custom credit/debit card fields hosted in your own page — the closest visual
match to Stripe Checkout.

- Looks the most impressive
- **Eligibility-gated**: about 37 countries and 22 currencies, and the account
  has to be approved. A fresh India-registered sandbox account almost certainly
  won't qualify. Check `/v1/identity/generate-token` eligibility before betting
  the project on it.
- Recommendation: build Option A first, treat C as a stretch goal

### Option D — PayPal Payment Links / hosted invoices

No code at all. Not worth anything in a portfolio — skip.

**This document implements Option A.**

---

## 1. Create the developer account and app

1. Go to <https://developer.paypal.com/> and log in with any PayPal account
   (create a personal one if you don't have one — no KYC needed for sandbox).
2. Dashboard → **Apps & Credentials** → make sure the **Sandbox** toggle is on.
3. **Create App** → name it (e.g. `store-demo`) → type **Merchant**.
4. Copy the **Client ID** and **Secret** into `store/.env.local`:

```
PAYPAL_CLIENT_ID=AZxK9...
PAYPAL_CLIENT_SECRET=EL8n2...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AZxK9...
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

Sandbox and live credentials are on separate tabs. If a call ever hits
`api-m.paypal.com` without `sandbox`, stop — that's the live environment.

## 2. Sandbox test accounts

Dashboard → **Testing Tools** → **Sandbox Accounts**.

PayPal pre-creates two for you:

| Type | Use |
|---|---|
| **Business** | the merchant — this is "your store" receiving the money |
| **Personal** | the buyer — log in as this at checkout |

Click the Personal account → **View/Edit** to get its email and system-generated
password. You'll type those into the PayPal popup during testing, so keep them
handy. The personal account comes preloaded with a fake balance and a test card.

> ### ⚠️ The buyer account must NOT be India-based
>
> This cost an hour of debugging, so it's worth stating plainly. Sandbox
> accounts inherit the country of your developer account. **PayPal shut down
> domestic payments within India in 2021, and the sandbox mirrors that** — an
> India-based *personal* account cannot complete a purchase. What you see is a
> login that times out quickly followed by:
>
> > Things don't appear to be working at the moment.
>
> …which says nothing about the real cause. Order creation succeeds, the order
> sits at `CREATED` with no payer, and everything looks fine server-side.
>
> **Fix:** Sandbox Accounts → **Create account** → type **Personal**, country
> **United States**. Use that account at checkout.
>
> To be clear about why this is fine: sandbox accounts are fictional test
> fixtures with fake balances. Nothing is being asserted about anyone's real
> identity or business, unlike a live provider signup.
>
> The **business** account can stay India-based — it accepts USD, EUR and GBP
> from a cross-border buyer. Confirm with
> `npx tsx scripts/diagnose-paypal-account.ts`, which probes exactly this.
>
> Related symptom, different cause: *"You are logging in to the account of the
> seller for this purchase"* means you used the **business** account to buy.
> PayPal blocks buying from yourself — log out fully and use the personal one.
>
> Note INR is rejected at order creation with `CURRENCY_NOT_SUPPORTED`; PayPal's
> REST API does not support it. This store prices in USD, which is unaffected.

## 3. Install the SDK

```powershell
cd store
npm install @paypal/react-paypal-js
```

`@paypal/react-paypal-js` provides the `<PayPalButtons />` React component.

> **Note on the server SDK:** `@paypal/paypal-server-sdk` is *not* installed.
> The server side is four REST calls (token, create, capture, verify) and the
> raw `fetch` versions below are clearer about what actually goes over the
> wire — which is the part worth showing a reviewer. The build spec also asks
> for fewer dependencies where a simpler option exists.

## 4. Expose localhost for webhooks

**This is the biggest practical difference from Stripe.** There is no
`stripe listen` equivalent — PayPal pushes webhooks to a public HTTPS URL only,
so `localhost:3000` won't work. You need a tunnel.

```powershell
winget install --id ngrok.ngrok
ngrok config add-authtoken <token from dashboard.ngrok.com>
ngrok http 3000
```

It prints a public URL like `https://abc123.ngrok-free.app`.

> **Grab a free static domain.** ngrok gives one per account
> (dashboard.ngrok.com → Domains). Without it the URL changes on every restart
> and you'll be re-editing the webhook every session. With it:
> `ngrok http 3000 --domain=your-name.ngrok-free.app`
>
> `cloudflared tunnel --url http://localhost:3000` works too if you'd rather not
> make an ngrok account.

> **You do not need this to demo a purchase.** Capture is synchronous, so the
> full buy flow works without a tunnel. ngrok is only required to exercise the
> webhook reconciliation and idempotency paths. In production on Vercel the URL
> is already public, so this stops being a concern entirely.

## 5. Register the webhook

Dashboard → **Apps & Credentials** → your app → scroll to **Webhooks** →
**Add Webhook**.

- URL: `https://<your-tunnel>.ngrok-free.app/api/webhooks/paypal`
- Events: **`PAYMENT.CAPTURE.COMPLETED`** and **`CHECKOUT.ORDER.APPROVED`**

Copy the generated **Webhook ID** into `store/.env.local`:

```
PAYPAL_WEBHOOK_ID=4XY12345AB678901C
```

> **Nicer than Stripe here:** the webhook ID is stable. Stripe's `whsec_`
> rotates every time you restart `stripe listen`; this doesn't. When your tunnel
> URL changes, **edit the existing webhook's URL** rather than deleting and
> recreating it — editing keeps the same ID, so `.env.local` stays valid.

Restart `npm run dev` after editing `.env.local`.

## 6. Test cards and accounts

> **Don't look for a `4242` equivalent.** PayPal doesn't publish one universal
> test card the way Stripe does — cards are generated per sandbox account. Any
> number you find in a blog post may or may not work against *your* account.

**Primary method — log in as the sandbox personal account.** Use the email and
system-generated password from step 2. Most realistic, and always works.

**Card as guest:** get a number from **Testing Tools → Sandbox Accounts → your
personal account → Funding → Payment Methods**, or generate one with the card
generator at <https://developer.paypal.com/tools/sandbox/card-testing/>. Expiry
any future date, CVC any 3 digits, name and address anything.

**Testing the decline path** works differently from Stripe too. Rather than a
dedicated "always declines" card number, you trigger errors by entering a
**rejection trigger string in the card's name field**. The list is here:
<https://developer.paypal.com/tools/sandbox/negative-testing/test-values/>

Whichever number you end up with, hardcode it into your demo banner (see
Portfolio notes) so reviewers don't have to hunt for it.

---

## Running a full test purchase

1. Terminal 1: `cd store && npm run dev`
2. Terminal 2 (optional, webhook only): `ngrok http 3000 --domain=your-name.ngrok-free.app`
3. Add something to the cart, click **Proceed to Checkout**
4. Click the PayPal button, log in as the sandbox personal account, approve
5. Popup closes → your `onApprove` handler calls the capture route → success page
6. The webhook arrives a moment later and reconciles

Watch the ngrok inspector at <http://127.0.0.1:4040> to see the raw webhook
requests and replay them — it's the closest thing to `stripe listen` output.

### Replaying a webhook (idempotency check)

Open the ngrok inspector, find the `PAYMENT.CAPTURE.COMPLETED` request, hit
**Replay**. Stock must not decrement twice.

You can also use Dashboard → **Webhooks Simulator**, but note the catch below.

> ⚠️ **Simulator events fail signature verification.** Mock events are sent with
> a special webhook ID and cannot be verified via the
> `verify-webhook-signature` endpoint. If your handler rejects unverified
> events (it should), simulator events will 401 — that's correct behaviour, not
> a bug. Test signature verification with real sandbox transactions, and use
> ngrok replay for idempotency testing.

---

## Demo fallback — checkout without PayPal

Set `DEMO_CHECKOUT_FALLBACK=1` in `store/.env.local` and a **Simulate payment**
button appears beside the PayPal buttons on the cart page. It places a real
order — settled, stock decremented, cart cleared, visible in order history and
in the admin queue — without contacting PayPal at all.

**Why it exists.** This store gets demoed live. PayPal's sandbox has already
proven it can fail for reasons that have nothing to do with this codebase (see
the India buyer-account warning above), and losing checkout mid-pitch also loses
everything downstream of it — confirmation, history, fulfilment. There's a
smaller everyday reason too: the genuine flow leaves your site for PayPal's
sandbox login, which is roughly thirty seconds of someone else's UI in the
middle of your own demo.

**How it's fenced in.** It marks orders paid without money moving, so:

1. **Off unless explicitly enabled.** `/api/demo/checkout` returns **404** when
   `DEMO_CHECKOUT_FALLBACK` isn't `1` — the endpoint doesn't merely hide, it
   doesn't function.
2. **Sandbox only.** Refused unless `PAYPAL_API_BASE` points at
   `sandbox.paypal.com`. This is a whitelist: anything unrecognised counts as
   live, so a real-money configuration cannot self-settle even if the flag gets
   switched on by mistake.
3. **Stamped.** Every order it creates gets a `DEMO-…` value in
   `paypal_capture_id` and no `paypal_order_id`, so no amount of database
   inspection can confuse one with a genuine payment.

Note that `NODE_ENV` is deliberately *not* the gate. The demo runs on the
deployed build, which is exactly where a production check would disable it.

**What it does not do.** It doesn't exercise the PayPal integration, so it must
never be how we verify payments work — that's a real sandbox purchase plus
`verify-settlement.ts`. It shares `createPendingOrder()` and `settleOrder()`
with the real path, so what lands in the database is identical; only the payment
provider is absent.

---

## Migration notes — mapping the Stripe code to PayPal

### Auth: bearer key → OAuth2 token exchange

Stripe takes `sk_test_...` as a bearer token directly. PayPal makes you exchange
client ID + secret for a short-lived access token first. Tokens last ~9 hours;
cache them rather than fetching one per request. See `src/lib/paypal.ts`.

### The control flow changes shape

This is the part to actually think about, not just find-and-replace.

**Stripe:** create Checkout Session → redirect to Stripe's page → user pays →
redirect back to your success page → **webhook flips the order to paid.** The
webhook is the only thing that marks payment complete.

**PayPal:** create order → popup opens → user approves → popup closes and
`onApprove` fires in the browser → **your server captures and flips the order to
paid synchronously** → webhook arrives afterward.

So the capture route becomes the primary path and the webhook becomes the safety
net for when the browser closes mid-capture. Both must be idempotent, and both
must be able to run second without doing damage.

Keep the success page's "confirming payment…" state. It just resolves faster now
— usually from the capture response rather than from webhook polling.

### Never trust the client for linkage or amount

The capture route is called by the browser. If it marked *our* internal order
paid based on an order id the client handed us, a payer could approve a cheap
PayPal order and point the capture at an expensive internal one.

So the capture handler reads `custom_id` back out of PayPal's own capture
response to learn which internal order this really is, and checks the captured
amount against that order's stored `totalCents` before flipping status. This is
the PayPal equivalent of the spec's "the success page must not mark the order
paid" rule, and it is the detail worth pointing at in a review.

### File-by-file

| Stripe | PayPal | Notes |
|---|---|---|
| `POST /api/checkout` creates Session | `createPaypalOrder` action | Returns an order ID, not a redirect URL |
| `redirect(session.url)` | `<PayPalButtons />` | Buttons render in your page; no navigation |
| — | `POST /api/paypal/capture` | **New route.** No Stripe equivalent |
| `POST /api/webhooks/stripe` | `POST /api/webhooks/paypal` | Different verification, same job |
| `stripe.webhooks.constructEvent()` | `POST /v1/notifications/verify-webhook-signature` | Network call, not a local HMAC check |
| `checkout.session.completed` | `PAYMENT.CAPTURE.COMPLETED` | The "money is real" event |
| `session.metadata.orderId` | `purchase_units[0].custom_id` | Where you stash your internal order ID |
| `whsec_` signing secret | `PAYPAL_WEBHOOK_ID` | Stable, doesn't rotate on restart |

### Money conversion

Our schema stores integer cents everywhere (build spec §3, rule 3). PayPal speaks
decimal strings like `"249.00"`. Convert only at the boundary, and compare in
cents — never compare floats. See `centsToPaypalAmount` / `paypalAmountToCents`
in `src/lib/paypal.ts`.

### Idempotency

Stripe dedupes on the event ID. PayPal gives you two mechanisms:

**Outbound** — send a `PayPal-Request-Id` header on create and capture. Replaying
a request with the same ID returns the original result instead of creating a
duplicate. Derive it from the order ID so retries of the *same* order reuse it.

**Inbound** — because capture and webhook both settle the order, guard the
transition on current state rather than blindly decrementing:

```sql
UPDATE orders SET status = 'paid' WHERE id = $1 AND status = 'pending'
```

Decrement stock only if that UPDATE affected a row. Exactly one of capture or
webhook can win, so stock moves once no matter how many times either runs.

### Webhook verification

Two gotchas carried over from the Stripe handler:

- You still need the **raw body**. In Next.js App Router use `await req.text()`;
  don't let a body parser touch it first.
- Verification is a **network round-trip**, unlike Stripe's local HMAC. Return
  200 quickly and do the order work after, or you risk PayPal timing out and
  redelivering — which the idempotency guard should absorb anyway.

---

## Portfolio notes

- **Banner the checkout page**: "Demo store — sandbox mode, no real payments."
  Put the test card number and sandbox login right on the page. A reviewer who
  can't complete a purchase in 30 seconds will close the tab.
- **Say what's hard in the README**: server-side amount computation, webhook
  signature verification, idempotent capture. The integration is table stakes;
  the reasoning about double-delivery is the part that reads as senior.
- **Record a 30-second GIF** of a full purchase. Tunnels expire and hosted demos
  rot; the GIF keeps working after the ngrok URL dies.

## Going live (not needed for the demo)

Swap `PAYPAL_API_BASE` to `https://api-m.paypal.com`, use the Live tab's
credentials, and register a webhook on your real domain — it gets its own
webhook ID, separate from the sandbox one.

Live payouts require a verified PayPal business account, and for an India-based
account receiving USD there are export-documentation requirements. Out of scope
for a portfolio piece, but worth knowing before quoting a client.

---

## Diagnostic scripts

All under `store/`, run with `npx tsx`:

| Script | What it answers |
|---|---|
| `scripts/diagnose-paypal-account.ts` | Which currencies will this merchant accept? Is the account reachable at all? |
| `scripts/inspect-paypal-orders.ts` | What state does PayPal think our recent orders are in — and did a payer ever approve one? |
| `scripts/verify-paypal-order.ts` | Does PayPal accept our real order payload, and do `custom_id` and amounts round-trip exactly? |
| `scripts/verify-settlement.ts` | Can settlement double-decrement stock under duplicate or concurrent delivery? (No DB or PayPal setup beyond a seeded database.) |

`inspect-paypal-orders.ts` is the one to reach for when a checkout fails in the
browser: if it reports `CREATED` with no payer, the order was fine and the
failure was inside PayPal's UI, not our code.

## Reference

- Orders v2 API: <https://developer.paypal.com/docs/api/orders/v2/>
- Standard Checkout: <https://developer.paypal.com/studio/checkout/standard/integrate>
- Webhooks: <https://developer.paypal.com/api/rest/webhooks/>
- Idempotency: <https://developer.paypal.com/reference/guidelines/idempotency/>
- Sandbox negative testing: <https://developer.paypal.com/tools/sandbox/negative-testing/>
- Advanced Checkout eligibility: <https://developer.paypal.com/docs/checkout/advanced/eligibility/>
