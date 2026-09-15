# Fix: live site redirects to Vercel SSO instead of loading

## Symptom reported

The user said "the database isn't loading stuff" on the live deployment:

```
https://acoustic-ledger-2bn24ihy8-rishab75695s-projects.vercel.app/
```

## Actual root cause (already diagnosed — do not re-investigate the database)

This is **not** a database/Neon problem. Every request to that URL — including
the plain homepage — returns an HTTP 302 redirect to Vercel's own login wall
before Next.js or the database are ever reached:

```
$ curl -sI https://acoustic-ledger-2bn24ihy8-rishab75695s-projects.vercel.app/
HTTP/1.1 302 Found
Location: https://vercel.com/sso-api?url=...&nonce=...
Server: Vercel
```

That `Location` header pointing at `vercel.com/sso-api` is **Vercel
Deployment Protection** ("Vercel Authentication"). It gates the URL behind a
login only the Vercel team's members can pass. To an outside visitor (or the
user testing in an incognito window) this looks exactly like "nothing loads."

Two contributing details:

1. The URL has a random hash segment
   (`acoustic-ledger-2bn24ihy8-...vercel.app`). That's the pattern for a
   **specific deployment's** unique URL, not a stable production alias — it
   may be a Preview deployment rather than the one promoted to Production.
2. Vercel can also apply "Vercel Authentication" to Production on some plans,
   producing the identical redirect there.

## What to do

1. **Vercel Dashboard → the project → Settings → Deployment Protection.**
   Check what's enabled for each environment (Production / Preview /
   Development).
2. Decide with the user whether to:
   - **Disable protection for Production** (makes the storefront fully
     public — appropriate for a demo store), or
   - **Keep protection on** and instead generate a **Protection Bypass for
     Automation** secret / shareable bypass link, if the user wants to keep
     it gated but demo it to someone specific.
   This is a visibility/access decision on shared infrastructure — confirm
   with the user before changing it, don't just flip it.
3. Separately, confirm which URL is actually the **Production** deployment
   (Deployments tab → the one marked "Production") rather than handing out a
   one-off preview/deployment-hash URL like the one above.
4. After changing protection settings, no redeploy is required for the
   protection toggle itself, but re-test immediately.

## Verify the fix (and *then* actually check the database)

Once protection is off (or you have a bypass), re-run:

```bash
curl -sI https://<the-production-url>/
# expect: HTTP/1.1 200
```

Only after confirming a real 200 with page content should the database be
checked — that's a separate, later step, not the cause of this symptom:

```bash
curl -H "x-health-token: $HEALTH_TOKEN" https://<the-production-url>/api/health
```

`HEALTH_TOKEN` is a Vercel env var (see `DEPLOY.md` at the repo root). If it's
unset, `/api/health` only ever returns `{ ok }` with no diagnostic detail —
that's expected, not a bug, per `DEPLOY.md`.

If `/api/health` (with the token) reports a DB connection failure, see
`DEPLOY.md` sections 1, 3, and 4 in the repo root for: the pooled-vs-direct
Neon connection string requirement, the full list of required env vars, and
the migrate/seed steps against production. Do not guess at DB fixes before
confirming with that authenticated health check — a missing `DATABASE_URL`
specifically manifests as `ECONNREFUSED` to `127.0.0.1:5432`, which is called
out explicitly in `DEPLOY.md` as easy to misdiagnose as a Neon outage.
