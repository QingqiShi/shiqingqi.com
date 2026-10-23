import type { ReplicaSnapshot } from "../replica/types.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectFxIndex } from "../store/select-fx-index.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { buildWeekMovers, type WeekMover } from "./build-week-movers.ts";
import { netWorthComparisonDays } from "./net-worth-comparison-days.ts";

/** How many accounts "What moved this week" shows. */
const MOVER_LIMIT = 5;

let lastMovers: {
  accounts: readonly AccountRow[];
  series: ReturnType<typeof selectBalanceSeriesByAccount>;
  fx: ReturnType<typeof selectFxIndex>;
  today: string;
  movers: WeekMover<AccountRow>[];
} | null = null;

/** The accounts that moved net worth most in the last week; the same array until what it reads changes. */
export function selectWeekMovers(
  snapshot: ReplicaSnapshot,
  today: string,
): WeekMover<AccountRow>[] {
  const accounts = liveRowSelectors.accounts(snapshot);
  const series = selectBalanceSeriesByAccount(snapshot);
  const fx = selectFxIndex(snapshot);
  if (
    lastMovers?.accounts === accounts &&
    lastMovers.series === series &&
    lastMovers.fx === fx &&
    lastMovers.today === today
  ) {
    return lastMovers.movers;
  }
  const movers = buildWeekMovers({
    accounts: accounts.filter((account) => !account.isSystem),
    seriesByAccount: series,
    fx,
    from: netWorthComparisonDays(today).lastWeek,
    to: today,
    limit: MOVER_LIMIT,
  });
  lastMovers = { accounts, series, fx, today, movers };
  return movers;
}
