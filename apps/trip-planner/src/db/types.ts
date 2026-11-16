import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { schema } from "./schema.ts";

export type TripsDb = PgDatabase<PgQueryResultHKT, typeof schema>;
