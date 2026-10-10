import { householdRepository } from "../db/repositories/household-repository.ts";
import {
  syncReadRepository,
  type SyncReadOptions,
} from "../db/repositories/sync-read-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { setStatementTimeout } from "../db/set-statement-timeout.ts";
import type { FinanceDb } from "../db/types.ts";
import { addMonths } from "../domain/dates/add-months.ts";
import { rowSchemas, type SyncTableName } from "./row-schemas.ts";

/** Rows as the database returns them; JSON turns their timestamps into the wire's ISO strings. */
type ServerSyncTables = Partial<Record<SyncTableName, object[]>>;

/** Above these sizes a bootstrap sends only the recent part of the large tables. */
const BOOTSTRAP_WINDOW = {
  postedTransactions: 50_000,
  balanceDays: 200_000,
  months: 24,
};

export const SYNC_TABLE_NAMES = Object.keys(rowSchemas).filter(
  (name): name is SyncTableName => name in rowSchemas,
);

/**
 * Runs `read` on one consistent snapshot, so the clock it reads matches the
 * rows: a batch that commits during the read is either wholly in or wholly
 * out.
 */
export function readSnapshot<T>(
  db: FinanceDb,
  householdId: string,
  read: (scope: RepositoryScope) => Promise<T>,
) {
  return db.transaction(
    async (tx) => {
      await setStatementTimeout(tx);
      return read({ db: tx, householdId });
    },
    {
      isolationLevel: "repeatable read",
      accessMode: "read only",
    },
  );
}

export function readTable(
  scope: RepositoryScope,
  table: SyncTableName,
  options: SyncReadOptions,
): Promise<object[]> {
  return syncReadRepository.tables[table](scope, options);
}

/** The bootstrap window for a Household: null days mean everything is sent. */
export async function bootstrapWindow(
  scope: RepositoryScope,
  today: string,
): Promise<SyncReadOptions> {
  const from = addMonths(today, -BOOTSTRAP_WINDOW.months);
  const posted = await syncReadRepository.countPostedTransactions(scope);
  const balanceDays = await syncReadRepository.countBalanceDays(scope);
  return {
    since: null,
    transactionsFrom:
      posted >= BOOTSTRAP_WINDOW.postedTransactions ? from : null,
    balanceDaysFrom: balanceDays > BOOTSTRAP_WINDOW.balanceDays ? from : null,
  };
}

/** Every synced row of the Household with a version above `since`, and the clock they reach. */
export async function pullChanges(
  db: FinanceDb,
  householdId: string,
  since: number,
) {
  return readSnapshot(db, householdId, async (scope) => {
    const household = await householdRepository.find(scope);
    if (!household) throw new Error("Household not found");
    const tables: ServerSyncTables = {};
    if (since >= household.clock) {
      return { clock: household.clock, household, tables };
    }
    const options = { since, transactionsFrom: null, balanceDaysFrom: null };
    for (const table of SYNC_TABLE_NAMES) {
      const rows = await readTable(scope, table, options);
      if (rows.length > 0) tables[table] = rows;
    }
    return { clock: household.clock, household, tables };
  });
}
