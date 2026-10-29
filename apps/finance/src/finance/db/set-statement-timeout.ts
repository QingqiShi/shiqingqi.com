import { sql } from "drizzle-orm";
import type { FinanceDb } from "./types.ts";

/** The longest one statement of a request may run. */
const STATEMENT_TIMEOUT_MS = 60_000;

/**
 * Sets the statement timeout for the rest of the open transaction. `set
 * local` is the one form that is safe behind the Neon pooler (PgBouncer in
 * transaction mode); a session setting can reach another client.
 */
export async function setStatementTimeout(tx: Pick<FinanceDb, "execute">) {
  await tx.execute(
    sql.raw(`set local statement_timeout = ${String(STATEMENT_TIMEOUT_MS)}`),
  );
}
