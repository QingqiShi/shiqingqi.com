import {
  balanceCheckRepository,
  type BalanceDrift,
} from "../db/repositories/balance-check-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { runServerWrite } from "../sync/run-server-write.ts";

const BATCH = 5000;

/**
 * Checks the account days that the triggers queued for one Household, and
 * works out again each account with a wrong day from its first wrong day.
 * The check runs without the Household lock; only a repair takes it. Only
 * ids queued before the run starts are checked, so the rows that a repair
 * queues are checked on the next run. A row queued while a batch is checked
 * has an id the batch did not read, so it stays. Calls `onDrift` once for
 * each wrong account of a batch.
 */
export async function repairBalanceDays(
  db: FinanceDb,
  householdId: string,
  now: Date,
  onDrift: (drift: BalanceDrift) => void,
) {
  const upToId = await withHousehold(db, householdId, (scope) =>
    balanceCheckRepository.latestId(scope),
  );
  if (upToId === 0) return { checked: 0, drifts: 0 };
  let checked = 0;
  let drifts = 0;
  for (;;) {
    const batch = await withHousehold(
      db,
      householdId,
      async (scope) => {
        const ids = await balanceCheckRepository.nextIds(scope, upToId, BATCH);
        const found = await balanceCheckRepository.findDrift(scope, ids);
        return { ids, found };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
    if (batch.ids.length === 0) break;
    if (batch.found.length === 0) {
      await withHousehold(db, householdId, (scope) =>
        balanceCheckRepository.remove(scope, batch.ids),
      );
    } else {
      await runServerWrite(db, householdId, now, async (context) => {
        for (const drift of batch.found) {
          context.touches.account(drift.accountId, drift.day);
        }
        await balanceCheckRepository.remove(context.scope, batch.ids);
      });
      for (const drift of batch.found) onDrift(drift);
    }
    checked += batch.ids.length;
    drifts += batch.found.length;
    if (batch.ids.length < BATCH) break;
  }
  return { checked, drifts };
}
