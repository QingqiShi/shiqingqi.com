import { useSearchParams } from "next/navigation";
import { useLocale } from "#src/i18n/use-locale.ts";
import { financeHref, readNewTransaction } from "../navigation/finance-href.ts";
import { useFinanceNavigator } from "../navigation/finance-navigator.ts";
import {
  transactionFilters,
  type TransactionFilters,
  type TransactionKind,
} from "./transaction-filters.ts";

function paramsNow() {
  return new URLSearchParams(window.location.search);
}

/** The filters in the URL now, which Next's search params give one render late. */
function filtersNow() {
  return transactionFilters.parse(paramsNow());
}

/**
 * The Transactions screen's state in the URL: the filters, `?id=` for the
 * selected Transaction, and a new Transaction (`?new=<kind>`) for a blank
 * editor. A selection stays in the browser, so it works offline.
 */
export function useTransactionsUrl() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const navigator = useFinanceNavigator();

  const filters = transactionFilters.parse(searchParams);
  const selectedId = searchParams.get("id");
  const newTransaction = readNewTransaction(searchParams);
  const isOpen = selectedId !== null || newTransaction !== null;
  const openOrReplace = isOpen ? navigator.replace : navigator.open;

  return {
    filters,
    selectedId,
    newKind: newTransaction?.kind ?? null,
    refundOfId: newTransaction?.refundOf ?? null,
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

    /** Opens a blank editor, or a refund of `refundOf`. */
    openNew(kind: TransactionKind, refundOf?: string) {
      openOrReplace({
        screen: "transactions",
        filters: filtersNow(),
        newTransaction: { kind, refundOf },
      });
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
