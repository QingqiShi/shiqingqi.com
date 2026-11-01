import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { schema } from "./schema.ts";

export type AssistantDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/** What a function that reads or writes one user's rows takes. */
export interface UserScope {
  db: AssistantDb;
  userId: string;
}
