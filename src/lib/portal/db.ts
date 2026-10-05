import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/lib/db/schema";

// Every portal data function takes its database as a parameter instead of
// calling getDb() itself, so the client-isolation tests can run the exact
// same code against an in-memory Postgres (PGlite) — see
// src/lib/portal/isolation.test.ts. Production callers pass getDb().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PortalDb = PgDatabase<PgQueryResultHKT, typeof schema, any>;
