import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { schema } from "./schema.ts";

export type BuddyDb = PgDatabase<PgQueryResultHKT, typeof schema>;
