/**
 * Loads .env.local for standalone scripts.
 *
 * Import this *before* anything that reads process.env at module scope —
 * ESM executes module bodies in dependency order, so the import position
 * is what makes this work.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
