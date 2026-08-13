import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  // Next.js loads .env.local itself; this only matters for standalone
  // scripts (seed, etc.) run directly via tsx.
  config({ path: ".env.local" });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
