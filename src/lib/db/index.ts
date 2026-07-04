import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Lazily constructs the Drizzle client so importing this module never
 * throws when DATABASE_URL isn't set yet (e.g. before Neon is connected).
 */
export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(neon(connectionString), { schema });
}

