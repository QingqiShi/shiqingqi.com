import { netWorthAt } from "../domain/balance/net-worth-at.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import { liveRowSelectors } from "./live-row-selectors.ts";
import { selectBalanceSeriesByAccount } from "./select-balance-series-by-account.ts";
import { selectFxIndex } from "./select-fx-index.ts";

/** Net worth at the end of `day`, in minor units of the base currency. */
export function selectNetWorthAt(snapshot: ReplicaSnapshot, day: string) {
  return netWorthAt(
    liveRowSelectors.accounts(snapshot),
    selectBalanceSeriesByAccount(snapshot),
    selectFxIndex(snapshot),
    day,
  );
}
