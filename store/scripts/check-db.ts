/**
 * Is the database reachable, and how far away is it?
 *
 * Connects through the same `pg` Pool the app uses rather than psql, because
 * the two don't share TLS defaults — this is what actually answers whether
 * node-postgres honours `sslmode=require` from the connection string against
 * a given provider.
 *
 * Point it at production by exporting DATABASE_URL first; dotenv won't
 * override a variable that's already set, so .env.local can't clobber it.
 *
 *   $env:DATABASE_URL = "<pooled neon string>"
 *   npx tsx scripts/check-db.ts
 */
import "./_env";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const host = /@([^/]+)\//.exec(url)?.[1] ?? "unknown";
  console.log(`host: ${host}`);
  console.log(`pooled: ${host.includes("-pooler")}`);

  const pool = new Pool({ connectionString: url });

  const cold = Date.now();
  const { rows } = await pool.query(
    "select current_database() as db, current_user as usr, version() as version"
  );
  console.log(`\nconnected in ${Date.now() - cold}ms (includes any cold start)`);
  console.log(`  database: ${rows[0].db}`);
  console.log(`  user:     ${rows[0].usr}`);
  console.log(`  server:   ${String(rows[0].version).split(",")[0]}`);

  const ssl = await pool.query("show ssl");
  console.log(`  ssl:      ${ssl.rows[0].ssl}`);

  // Separates the cold start from steady-state latency, which is what every
  // subsequent query on a warm connection actually costs.
  const warm = Date.now();
  await pool.query("select 1");
  console.log(`  warm rtt: ${Date.now() - warm}ms`);

  const tables = await pool.query<{ name: string; rows: number }>(`
    select c.relname as name, c.reltuples::bigint as rows
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `);

  console.log(`\npublic tables: ${tables.rowCount}`);
  for (const t of tables.rows) console.log(`  ${t.name}`);

  await pool.end();
}

main().catch((err) => {
  console.error("\nFAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
