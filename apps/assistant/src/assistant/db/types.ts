import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { schema } from "./schema.ts";

export type AssistantDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export type { UserScope } from "./scope-to.ts";
