import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  // Next.js loads .env.local itself; this only matters for standalone
  // scripts (seed, etc.) run directly via tsx.
  config({ path: ".env.local" });
}

// Every serverless instance gets its own pool, and Vercel spawns many
// instances under load — so the real connection count is
// instances × max, not just max. An unbounded pool here exhausts Postgres's
// max_connections long before the functions themselves fall over, and once
// that happens every page 500s, not just the ones under load. `max: 2` keeps
// each instance's footprint small; connectionTimeoutMillis makes a request
// fail fast instead of hanging when the pool (or Postgres itself) is
// already saturated. If production is Neon, this must point at the
// *pooled* connection string (host contains `-pooler`) — see DEPLOY.md.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });
