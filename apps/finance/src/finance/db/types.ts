import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { schema } from "./schema.ts";

export type FinanceDb = PgDatabase<PgQueryResultHKT, typeof schema>;
