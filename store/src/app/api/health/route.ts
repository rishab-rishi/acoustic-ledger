import { Pool } from "pg";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostic: can this runtime actually reach its database?
 *
 * Exists because a misconfigured DATABASE_URL and an unreachable database
 * produce the same symptom — every page 500s — and the difference isn't
 * visible from outside. Reports the host and whether the variable is present,
 * never the credentials.
 *
 * Doubles as the endpoint to ping before a demo: Neon scales to zero, so one
 * request here warms it and takes the cold start off the first real page view.
 */
export async function GET() {
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
      { ok: false, reason: "DATABASE_URL is not set in this deployment", env },
      { status: 503 }
    );
  }

  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 8000 });
  const started = Date.now();

  try {
    const { rows } = await pool.query(
      "select (select count(*) from products)::int as products, (select count(*) from categories)::int as categories"
    );
    return Response.json({
      ok: true,
      env,
      db: { latencyMs: Date.now() - started, ...rows[0] },
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        reason: "query failed",
        env,
        db: {
          latencyMs: Date.now() - started,
          error: err instanceof Error ? err.message : String(err),
          code: (err as { code?: string })?.code ?? null,
        },
      },
      { status: 503 }
    );
  } finally {
    await pool.end().catch(() => {});
  }
}
