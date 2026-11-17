import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type BuddyDb = PgDatabase<PgQueryResultHKT>;
