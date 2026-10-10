import type { DerivedChanges } from "../db/repositories/recompute-derived.ts";
import { startOfMonth } from "../domain/dates/start-of-month.ts";

/** Collects which balances and month totals a batch may have changed. */
export class DerivedTouches implements DerivedChanges {
  readonly accounts = new Map<string, string>();
  readonly months = new Set<string>();

  /** The balances of `accountId` may have changed from `day` on. */
  account(accountId: string, day: string) {
    const previous = this.accounts.get(accountId);
    if (previous === undefined || day < previous) {
      this.accounts.set(accountId, day);
    }
  }

  /** The totals of the month that holds `day` may have changed. */
  month(day: string) {
    this.months.add(startOfMonth(day));
  }

  get isEmpty() {
    return this.accounts.size === 0 && this.months.size === 0;
  }
}
