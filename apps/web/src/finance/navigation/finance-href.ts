import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { analyticsParams } from "../analytics/analytics-params.ts";
import type { AnalyticsState } from "../analytics/compute-analytics-view.ts";
import { FINANCE_DESTINATION_PATHS } from "../shell/finance-destination-paths.ts";
import {
  EMPTY_TRANSACTION_FILTERS,
  isTransactionKind,
  transactionFilters,
  type TransactionFilters,
  type TransactionKind,
} from "../transactions/transaction-filters.ts";

/** A new Transaction in an editor over a screen: `?new=<kind>`, with `&refund=<id>` for a refund. */
export interface NewTransaction {
  kind: TransactionKind;
  /** The Transaction that the new one refunds. */
  refundOf?: string | null;
}

interface OverScreen {
  /** The new Transaction over the screen, or none. */
  newTransaction?: NewTransaction | null;
}

export type NetWorthMode = "update" | "reorder";

/** `/finance`: `?account=` in the content column, `&tx=` for a Transaction of its Ledger in the detail column, or `?mode=`. */
export interface NetWorthDestination extends OverScreen {
  screen: "netWorth";
  /** The account in the content column, or null for the Household. */
  account?: string | null;
  /** A Transaction of the account's Ledger. It needs `account`. */
  tx?: string | null;
  mode?: NetWorthMode | null;
}

/** `/finance/transactions`: the list's filters, and `?id=` for the Transaction in the detail column. */
export interface TransactionsDestination extends OverScreen {
  screen: "transactions";
  filters?: Partial<TransactionFilters>;
  id?: string | null;
}

/** `/finance/analytics` with its state, the default one when it is not given. */
interface AnalyticsDestination extends OverScreen {
  screen: "analytics";
  state?: AnalyticsState;
}

/** The screen that shows, with its own state as it is. */
interface CurrentDestination extends OverScreen {
  screen: "current";
}

/** A place in Finance that a link or a history entry goes to. */
export type FinanceDestination =
  | NetWorthDestination
  | TransactionsDestination
  | AnalyticsDestination
  | (OverScreen & { screen: "reports" | "settings" })
  | CurrentDestination;

type FinanceScreen = Exclude<FinanceDestination["screen"], "current">;

const [netWorth, transactions, analytics, reports, settings] =
  FINANCE_DESTINATION_PATHS;
const SCREEN_PATHS: Record<FinanceScreen, string> = {
  netWorth,
  transactions,
  analytics,
  reports,
  settings,
};

const NET_WORTH_MODES: readonly NetWorthMode[] = ["update", "reorder"];

interface ReadableParams {
  get: (name: string) => string | null;
}

/** The Net worth state in `params`. */
export function readNetWorth(params: ReadableParams) {
  const account = params.get("account");
  const mode = params.get("mode");
  return {
    account,
    tx: account === null ? null : params.get("tx"),
    mode: NET_WORTH_MODES.find((candidate) => candidate === mode) ?? null,
  };
}

/** The new Transaction in `params`, or null for none. */
export function readNewTransaction(
  params: ReadableParams,
): Required<NewTransaction> | null {
  const kind = params.get("new");
  if (kind === null || !isTransactionKind(kind)) return null;
  return { kind, refundOf: params.get("refund") };
}

function screenParams(
  to: Exclude<FinanceDestination, CurrentDestination>,
): URLSearchParams {
  switch (to.screen) {
    case "netWorth": {
      const params = new URLSearchParams();
      if (to.account != null) {
        params.set("account", to.account);
        if (to.tx != null) params.set("tx", to.tx);
      }
      if (to.mode != null) params.set("mode", to.mode);
      return params;
    }
    case "transactions": {
      const params = transactionFilters.write(new URLSearchParams(), {
        ...EMPTY_TRANSACTION_FILTERS,
        ...to.filters,
      });
      if (to.id != null) params.set("id", to.id);
      return params;
    }
    case "analytics":
      return to.state ? analyticsParams.write(to.state) : new URLSearchParams();
    case "reports":
    case "settings":
      return new URLSearchParams();
  }
}

/** `pathname` with the query of `params`, or `pathname` alone when `params` is empty. */
function withQuery(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * The href of `to`. A `current` destination keeps the path and the query of
 * `current`, the location that shows, and takes `window.location` when it
 * is not given.
 */
export function financeHref(
  to: FinanceDestination,
  locale: SupportedLocale,
  current?: { pathname: string; search: string },
): string {
  let pathname: string;
  let params: URLSearchParams;
  if (to.screen === "current") {
    const location = current ?? window.location;
    pathname = location.pathname;
    params = new URLSearchParams(location.search);
    params.delete("new");
    params.delete("refund");
  } else {
    pathname = getLocalePath(SCREEN_PATHS[to.screen], locale);
    params = screenParams(to);
  }
  const newTransaction = to.newTransaction ?? null;
  if (newTransaction !== null) {
    params.set("new", newTransaction.kind);
    if (newTransaction.refundOf != null) {
      params.set("refund", newTransaction.refundOf);
    }
  }
  return withQuery(pathname, params);
}
