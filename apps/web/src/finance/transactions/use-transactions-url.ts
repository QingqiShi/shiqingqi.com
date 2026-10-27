import { usePathname, useSearchParams } from "next/navigation";
import { hrefWithParams } from "../shell/href-with-params.ts";
import {
  closeEntry,
  deleteNewTransaction,
  pushOpenedEntry,
  readNewTransaction,
  replaceEntry,
  setNewTransaction,
} from "../shell/use-new-transaction-url.ts";
import {
  transactionFilters,
  type TransactionFilters,
  type TransactionKind,
} from "./transaction-filters.ts";

/** Drops the open Transaction, or the blank editor, from the URL's params. */
function clearSelection(params: URLSearchParams) {
  params.delete("id");
  deleteNewTransaction(params);
}

/**
 * The Transactions screen's state in the URL: the filters, `?id=` for the
 * selected Transaction, and `?new=<kind>` (with `&refund=<id>` for a refund)
 * for a blank editor. It writes with the History API, which Next's router
 * follows without a server round trip, so a selection works offline.
 */
export function useTransactionsUrl() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const filters = transactionFilters.parse(searchParams);
  const selectedId = searchParams.get("id");
  const { kind: newKind, refundOfId } = readNewTransaction(searchParams);

  const write = (
    change: (params: URLSearchParams) => void,
    mode: "push" | "replace",
  ) => {
    const params = new URLSearchParams(window.location.search);
    change(params);
    const url = hrefWithParams(pathname, params);
    if (mode === "push") pushOpenedEntry(url);
    else replaceEntry(url);
  };

  const isOpen = selectedId !== null || newKind !== null;

  return {
    filters,
    selectedId,
    newKind,
    refundOfId,
    isOpen,

    setFilters(next: TransactionFilters) {
      write((params) => {
        const written = transactionFilters.write(params, next);
        for (const key of [...params.keys()]) params.delete(key);
        for (const [key, value] of written) params.append(key, value);
      }, "replace");
    },

    /** Selects a Transaction. A pane already open changes in place, so back still closes it. */
    open(id: string) {
      write(
        (params) => {
          deleteNewTransaction(params);
          params.set("id", id);
        },
        isOpen ? "replace" : "push",
      );
    },

    /** Opens a blank editor, or a refund of `refundOf`. */
    openNew(kind: TransactionKind, refundOf?: string) {
      write(
        (params) => {
          params.delete("id");
          setNewTransaction(params, kind, refundOf);
        },
        isOpen ? "replace" : "push",
      );
    },

    /** The URL with nothing open, for a link back to the list. */
    hrefWithout() {
      const params = new URLSearchParams(searchParams);
      clearSelection(params);
      return hrefWithParams(pathname, params);
    },

    close() {
      const params = new URLSearchParams(window.location.search);
      clearSelection(params);
      closeEntry(hrefWithParams(pathname, params));
    },
  };
}
