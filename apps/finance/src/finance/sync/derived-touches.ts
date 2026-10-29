import type { DerivedChanges } from "../db/repositories/recompute-derived.ts";

/** Collects which balances a batch may have changed. */
export class DerivedTouches implements DerivedChanges {
  readonly accounts = new Map<string, string>();

  /** The balances of `accountId` may have changed from `day` on. */
  account(accountId: string, day: string) {
    const previous = this.accounts.get(accountId);
    if (previous === undefined || day < previous) {
      this.accounts.set(accountId, day);
    }
  }

  get isEmpty() {
    return this.accounts.size === 0;
  }
}
