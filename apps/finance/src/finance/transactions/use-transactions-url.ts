import { useLocale } from "@tuja/i18n/use-locale";
import { useSearchParams } from "next/navigation";
import { financeHref, readNewTransaction } from "../navigation/finance-href.ts";
import { useFinanceNavigator } from "../navigation/finance-navigator.ts";
import {
  transactionFilters,
  type TransactionFilters,
} from "./transaction-filters.ts";

function paramsNow() {
  return new URLSearchParams(window.location.search);
}

/** The filters in the URL now, which Next's search params give one render late. */
function filtersNow() {
  return transactionFilters.parse(paramsNow());
}

/**
 * The Transactions screen's state in the URL: the filters, and `?id=` for
 * the selected Transaction. A new Transaction (`?new=<kind>`) also counts
 * as open. A selection stays in the browser, so it works offline.
 */
export function useTransactionsUrl() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const navigator = useFinanceNavigator();

  const filters = transactionFilters.parse(searchParams);
  const selectedId = searchParams.get("id");
  const isOpen =
    selectedId !== null || readNewTransaction(searchParams) !== null;
  const openOrReplace = isOpen ? navigator.replace : navigator.open;

  return {
    filters,
    selectedId,
    isOpen,

    /** Changes the filters. What is open stays open, so an edit in it is kept. */
    setFilters(next: TransactionFilters) {
      const params = paramsNow();
      navigator.replace({
        screen: "transactions",
        filters: next,
        id: params.get("id"),
        newTransaction: readNewTransaction(params),
      });
    },

    /** Selects a Transaction. A pane already open changes in place, so back still closes it. */
    open(id: string) {
      openOrReplace({ screen: "transactions", filters: filtersNow(), id });
    },

    /** The URL with the Transaction `id` open, for its row. */
    hrefOf(id: string) {
      return financeHref({ screen: "transactions", filters, id }, locale);
    },

    /** The URL with nothing open, for a link back to the list. */
    hrefWithout() {
      return financeHref({ screen: "transactions", filters }, locale);
    },

    close() {
      navigator.close({ screen: "transactions", filters: filtersNow() });
    },
  };
}
