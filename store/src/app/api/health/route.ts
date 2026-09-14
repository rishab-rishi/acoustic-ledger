import { timingSafeEqual } from "node:crypto";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostic: can this runtime actually reach its database?
 *
 * Exists because a misconfigured DATABASE_URL and an unreachable database
 * produce the same symptom — every page 500s — and the difference isn't
 * visible from outside. Reports the host and whether the variable is present,
 * never the credentials — but only to a caller holding HEALTH_TOKEN.
 *
 * Doubles as the endpoint to ping before a demo: Neon scales to zero, so one
 * request here warms it and takes the cold start off the first real page view.
 *
 * Unauthenticated callers (including HEALTH_TOKEN being unset entirely) get a
 * bare `{ ok }` with no hostname, region, env-var names, or driver errors —
 * that detail is a map of the infrastructure and must never fall open.
 */
export function isAuthorized(request: Request): boolean {
  const token = process.env.HEALTH_TOKEN;
  if (!token) return false; // unset means never serve the detailed body

  const provided = request.headers.get("x-health-token");
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(token);
  // timingSafeEqual throws on length mismatch rather than returning false,
  // and its runtime already leaks length via early return if we skip this.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const authorized = isAuthorized(request);
  const url = process.env.DATABASE_URL;

  const env = {
    hasDatabaseUrl: Boolean(url),
    // Host is not a credential; the password never leaves this function.
    host: url ? (/@([^/]+)\//.exec(url)?.[1] ?? "unparseable") : null,
    pooled: url ? url.includes("-pooler") : null,
    region: process.env.VERCEL_REGION ?? null,
    // Names the Neon integration injects, to spot a naming mismatch.
    alsoPresent: [
      "POSTGRES_URL",
      "DATABASE_URL_UNPOOLED",
      "PGHOST",
      "NEON_PROJECT_ID",
    ].filter((k) => Boolean(process.env[k])),
  };

  if (!url) {
    return Response.json(
      authorized
        ? { ok: false, reason: "DATABASE_URL is not set in this deployment", env }
        : { ok: false },
      { status: 503 }
    );
  }

  // Reuses the shared, pool-bounded `db` from src/db/index.ts — no Pool is
  // constructed per request, so a flood of health checks can't exhaust
  // Postgres max_connections the way a `new Pool()`-per-call would.
  const started = Date.now();
  try {
    const [[{ n: productsCount }], [{ n: categoriesCount }]] = await Promise.all([
      db.select({ n: count() }).from(products),
      db.select({ n: count() }).from(categories),
    ]);
    return Response.json(
      authorized
        ? {
            ok: true,
            env,
            db: {
              latencyMs: Date.now() - started,
              products: productsCount,
              categories: categoriesCount,
            },
          }
        : { ok: true }
    );
  } catch (err) {
    return Response.json(
      authorized
        ? {
            ok: false,
            reason: "query failed",
            env,
            db: {
              latencyMs: Date.now() - started,
              error: err instanceof Error ? err.message : String(err),
              code: (err as { code?: string })?.code ?? null,
            },
          }
        : { ok: false },
      { status: 503 }
    );
  }
}
