import { householdRepository } from "../db/repositories/household-repository.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import { setStatementTimeout } from "../db/set-statement-timeout.ts";
import type { FinanceDb } from "../db/types.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { DerivedTouches } from "./derived-touches.ts";
import type { WriteContext } from "./types.ts";

/** A write the server makes on its own, such as a Bank sync. */
export interface ServerWriteContext extends WriteContext {
  household: { baseCurrency: string; timezone: string };
  /** Says that the write changed a synced row that touches no balance, so the clock must move. */
  markWritten: () => void;
}

/**
 * Runs `write` the way `applyMutations` runs a pushed batch: in one database
 * transaction, with the Household row locked, every row at version
 * `clock + 1`, then the derived rows worked out again and the clock moved.
 * The clock stays when the write touched nothing.
 */
export async function runServerWrite<Result>(
  db: FinanceDb,
  householdId: string,
  now: Date,
  write: (context: ServerWriteContext) => Promise<Result>,
): Promise<{ result: Result; clock: number }> {
  return db.transaction(async (tx) => {
    await setStatementTimeout(tx);
    const household = await householdRepository.lockForWrite({
      db: tx,
      householdId,
    });
    if (!household) throw new Error("Household not found");
    const version = household.clock + 1;
    const state = { written: false };
    const context: ServerWriteContext = {
      scope: { db: tx, householdId, version },
      today: todayInTimeZone(household.timezone, now),
      touches: new DerivedTouches(),
      household: {
        baseCurrency: household.baseCurrency,
        timezone: household.timezone,
      },
      markWritten: () => {
        state.written = true;
      },
    };
    const result = await write(context);
    if (!state.written && context.touches.isEmpty) {
      return { result, clock: household.clock };
    }
    await recomputeDerived(tx, householdId, context.touches, version);
    await householdRepository.setClock(context.scope, version);
    return { result, clock: version };
  });
}
