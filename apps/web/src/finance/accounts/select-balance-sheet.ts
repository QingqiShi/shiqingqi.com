import type { ReplicaSnapshot } from "../replica/types.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectFxIndex } from "../store/select-fx-index.ts";
import {
  buildBalanceSheet,
  type BalanceSheet,
  type BalanceSheetInput,
} from "./build-balance-sheet.ts";
import { selectLatestValuations } from "./select-latest-valuations.ts";

let last: { input: BalanceSheetInput; sheet: BalanceSheet } | null = null;

function sameInput(a: BalanceSheetInput, b: BalanceSheetInput) {
  return (
    a.day === b.day &&
    a.groups === b.groups &&
    a.accounts === b.accounts &&
    a.members === b.members &&
    a.latestValuations === b.latestValuations &&
    a.bankLinks === b.bankLinks &&
    a.seriesByAccount === b.seriesByAccount &&
    a.fx === b.fx
  );
}

/** The balance sheet on `day`; the same object until something it reads changes. */
export function selectBalanceSheet(
  snapshot: ReplicaSnapshot,
  day: string,
): BalanceSheet {
  const input: BalanceSheetInput = {
    groups: liveRowSelectors.accountGroups(snapshot),
    accounts: liveRowSelectors.accounts(snapshot),
    members: liveRowSelectors.members(snapshot),
    latestValuations: selectLatestValuations(snapshot),
    bankLinks: liveRowSelectors.bankLinks(snapshot),
    seriesByAccount: selectBalanceSeriesByAccount(snapshot),
    fx: selectFxIndex(snapshot),
    day,
  };
  if (last && sameInput(last.input, input)) return last.sheet;
  const sheet = buildBalanceSheet(input);
  last = { input, sheet };
  return sheet;
}
