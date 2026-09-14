# Deploying Acoustic Ledger

Production runbook for Phase 9. Everything runs on free tiers.

Two things about this stack differ from the original build spec and are worth
knowing before you start: payments are PayPal, not Stripe (see
`PAYPAL_SETUP.md` for why), and the database has been local Docker Postgres
throughout development rather than Neon. Neither changes the deploy shape.

---

## Order of operations

```
1. Neon project            → DATABASE_URL
2. Vercel import + env vars → first deploy
3. Migrate + seed          → catalog exists
4. PayPal webhook          → PAYPAL_WEBHOOK_ID, then redeploy
5. Smoke test              → prove a real purchase completes
```

Set the environment variables **before** the first deploy rather than after.
`NEXT_PUBLIC_*` values are inlined at build time, not read at runtime, so
adding `NEXT_PUBLIC_PAYPAL_CLIENT_ID` later has no effect until you redeploy —
checkout would render "Payments aren't configured yet" in the meantime.

There is no circular dependency on the deployed URL. `NEXT_PUBLIC_BASE_URL`
isn't referenced anywhere in the source (it was in the spec's Stripe-era env
list for building `success_url`; the PayPal flow uses relative URLs), and
Auth.js v5 trusts the host automatically on Vercel, so `AUTH_URL` is not
required either. Add `AUTH_URL` only if sign-in redirects misbehave.

---

## 1. Neon

<https://neon.tech> → new project, any region close to your Vercel region.

Copy the **pooled** connection string — the host contains `-pooler`. It looks
like:

```
postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

> **Use the pooled string, not the direct one.** Every Vercel request runs in
> its own lambda and opens its own connections. The direct endpoint has a low
> connection ceiling and will start refusing connections under any concurrency;
> the pooler exists for exactly this.

Free tier is 0.5 GB and 100 CU-hours/month, which this store will not come
close to.

## 2. Vercel

<https://vercel.com> → **Add New → Project** → import the GitHub repo.

> **Set Root Directory to `store`.** The repository root holds only
> `docker-compose.yml` and the `store/` folder, so a default import finds no
> Next.js app and the build fails.

Framework preset (Next.js), build command and output directory can all stay on
their defaults.

The first deploy will fail or render errors — no environment variables exist
yet. That's expected; the point is to get the URL.

## 3. Environment variables

Vercel → Project → Settings → Environment Variables. Set for **Production**
(and Preview if you want branch deploys to work).

| Variable | Value |
|---|---|
| `DATABASE_URL` | the pooled Neon string from step 1 |
| `AUTH_SECRET` | generate a fresh one: `npx auth secret` |
| `PAYPAL_CLIENT_ID` | sandbox client id |
| `PAYPAL_CLIENT_SECRET` | sandbox secret |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | same value as `PAYPAL_CLIENT_ID` |
| `PAYPAL_API_BASE` | `https://api-m.sandbox.paypal.com` |
| `PAYPAL_WEBHOOK_ID` | leave empty until step 5 |
| `DEMO_CHECKOUT_FALLBACK` | `1` to expose the "Simulate payment" button |
| `HEALTH_TOKEN` | a random string; generate one, e.g. `openssl rand -hex 32` |
| `CRON_SECRET` | a random string, same as `HEALTH_TOKEN` |

> **Set `HEALTH_TOKEN` before you rely on `/api/health`.** Without it — or with
> a request missing/mismatching `x-health-token` — the route returns only
> `{ ok }` and never the hostname, region, env var names, or driver error it
> shows when authenticated. Leaving it unset is safe (the route just never
> serves the detailed body) but you lose the diagnostic. Pass the header as
> `curl -H "x-health-token: $HEALTH_TOKEN" https://<your-app>.vercel.app/api/health`.

> **Set `CRON_SECRET` for the pending-order sweep to run at all.**
> `store/vercel.json` schedules `GET /api/cron/sweep-pending-orders` daily —
> Vercel calls it with `Authorization: Bearer $CRON_SECRET` automatically once
> the env var exists. Unlike `HEALTH_TOKEN`, leaving this unset does not
> degrade gracefully: the route 404s and abandoned `pending` orders (one per
> PayPal-button click that's never completed) accumulate forever instead of
> being swept after ~24h.

> **Generate a new `AUTH_SECRET`.** Don't reuse the development one. It signs
> session JWTs; a leaked dev secret would let anyone mint a session — including
> an admin one.

`DEMO_CHECKOUT_FALLBACK` is safe to enable here because the fallback refuses to
run unless `PAYPAL_API_BASE` points at the sandbox. See the *Demo fallback*
section of `PAYPAL_SETUP.md`.

If you add or change any of these after a deploy, redeploy (Deployments → ⋯ →
Redeploy). Env var changes do not rebuild on their own, and the
`NEXT_PUBLIC_*` ones only take effect in a fresh build.

> **`DATABASE_URL` must exist before the build.** Not because the build reads
> the database — it deliberately doesn't, see below — but because the app is
> useless without it and the failure is easy to misread. A missing variable
> makes `pg` fall back to `127.0.0.1:5432` and report `ECONNREFUSED`, which
> looks like a database outage rather than an unset variable.

### Builds don't touch the database

`app/not-found.tsx` is marked `force-dynamic` for this reason. Next prerenders
`/_not-found` at build time, and that page reads categories directly plus more
through the header and footer — which made `next build` require a reachable
database and failed the first deploy outright.

Rendering it per request keeps builds independent of Neon. That matters beyond
the initial setup: Neon scales to zero, so a build could otherwise fail
against a cold database for reasons unrelated to the change being deployed.

## 4. Migrate and seed

Run from your machine against the production database. `dotenv` does not
override variables that already exist, so exporting `DATABASE_URL` is enough —
`.env.local` will not clobber it.

```powershell
cd store
$env:DATABASE_URL = "<pooled neon string>"
npm run db:migrate
npm run db:seed
```

Then unset it so later local work doesn't touch production:

```powershell
Remove-Item Env:\DATABASE_URL
```

Seeding creates the demo catalog (5 categories, 38 products, 66 variants), the
historical orders that give the admin dashboard something to show, and two
accounts:

| Account | Password |
|---|---|
| `admin@demo.test` | `admin123` |
| `customer@demo.test` | `customer123` |

> These are demo credentials in a public repo. They are fine for a sandbox
> pitch and must never exist on a store handling real payments.

## 5. PayPal webhook

Developer Dashboard → **Apps & Credentials** → your app → **Webhooks** → **Add
Webhook**.

- URL: `https://<your-app>.vercel.app/api/webhooks/paypal`
- Events: `PAYMENT.CAPTURE.COMPLETED` and `CHECKOUT.ORDER.APPROVED`

Copy the generated **Webhook ID** into `PAYPAL_WEBHOOK_ID` in Vercel, then
redeploy.

No tunnel is needed now — the whole reason ngrok appears in `PAYPAL_SETUP.md`
is that PayPal only delivers to public HTTPS, which a Vercel URL already is.

Capture is synchronous, so purchases work even without the webhook configured.
The webhook is the reconciliation path for when a browser dies mid-capture.

## 6. Smoke test

Against the live URL, in order:

1. Catalog loads, search returns results, a category filter narrows them
2. Add to cart as a guest, refresh — the cart survives
3. Register an account — the guest cart carries over
4. Complete a purchase with the **US-based** sandbox buyer
5. Order flips to `paid`, stock drops by the quantity bought, cart clears
6. Sign in as admin, fulfil that order
7. 404 a made-up URL and confirm it offers a way back
8. Repeat the catalog and PDP at 375px wide

> **The sandbox buyer must not be India-based.** PayPal ended domestic India
> payments in 2021 and the sandbox mirrors it — an India-issued personal
> account cannot pay and reports it as a generic "things don't appear to be
> working". This cost an hour during Phase 5. Full symptoms in
> `PAYPAL_SETUP.md`.

---

## Live-demo hazards

**Neon scales to zero** after about 5 minutes idle, adding roughly half a
second to the first request. Load the site once shortly before presenting, or
add a Vercel cron that pings it.

**Vercel Hobby is non-commercial only.** Fine for a demo or a portfolio piece.
A store taking real revenue needs Pro. Worth knowing before someone asks
whether this can just be launched.

**PayPal sandbox is a dependency you don't control.** If it misbehaves during a
pitch, `DEMO_CHECKOUT_FALLBACK=1` gives you a checkout that completes without
touching PayPal, using the same settlement path — so order history, stock and
admin fulfilment all still demo correctly.

## Going live (out of scope for the demo)

Point `PAYPAL_API_BASE` at `https://api-m.paypal.com`, swap in Live-tab
credentials, and register a webhook on the production domain — it gets its own
ID, separate from the sandbox one. Note that the demo fallback disables itself
automatically when the API base is not the sandbox.

Live payouts need a verified PayPal business account, and an India-based
account receiving USD has export-documentation obligations. Worth pricing into
any client conversation.
