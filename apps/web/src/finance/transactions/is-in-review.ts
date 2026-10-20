import { MATCH_DAY_WINDOW } from "../bank/plan-bank-matches.ts";
import { addDays } from "../domain/dates/add-days.ts";

/** How many days an In transit Entry waits for a bank row to settle it before a person should look: the match window and two days more. */
const STALE_IN_TRANSIT_DAYS = MATCH_DAY_WINDOW + 2;

/**
 * Whether a Transaction is in Review: something flagged it (`needsReview`),
 * or it has an Entry on In transit dated more than `STALE_IN_TRANSIT_DAYS`
 * days before `today`, so no bank row settled it and a person must say
 * where the money went. Settling the Entry, or choosing its account, takes
 * the Transaction out of Review unless it is also flagged.
 */
export function isInReview(
  transaction: { needsReview: boolean },
  entries: readonly { accountId: string; date: string }[],
  accountById: ReadonlyMap<string, { isSystem: boolean }>,
  today: string,
): boolean {
  if (transaction.needsReview) return true;
  const staleBefore = addDays(today, -STALE_IN_TRANSIT_DAYS);
  return entries.some(
    (entry) =>
      entry.date < staleBefore &&
      accountById.get(entry.accountId)?.isSystem === true,
  );
}
