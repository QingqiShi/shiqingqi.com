import { usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { hrefWithParams } from "../shell/href-with-params.ts";
import {
  isTransactionKind,
  transactionFilters,
  type TransactionFilters,
  type TransactionKind,
} from "./transaction-filters.ts";

/** Drops the open Transaction, or the blank editor, from the URL's params. */
function clearSelection(params: URLSearchParams) {
  params.delete("id");
  params.delete("new");
  params.delete("refund");
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
  const pushedRef = useRef(false);

  const filters = transactionFilters.parse(searchParams);
  const selectedId = searchParams.get("id");
  const newParam = searchParams.get("new");
  const newKind =
    newParam !== null && isTransactionKind(newParam) ? newParam : null;
  const refundOfId = searchParams.get("refund");

  const write = (
    change: (params: URLSearchParams) => void,
    mode: "push" | "replace",
  ) => {
    const params = new URLSearchParams(window.location.search);
    change(params);
    const url = hrefWithParams(pathname, params);
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
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
      const mode = isOpen ? "replace" : "push";
      if (mode === "push") pushedRef.current = true;
      write((params) => {
        params.delete("new");
        params.delete("refund");
        params.set("id", id);
      }, mode);
    },

    /** Opens a blank editor, or a refund of `refundOf`. */
    openNew(kind: TransactionKind, refundOf?: string) {
      const mode = isOpen ? "replace" : "push";
      if (mode === "push") pushedRef.current = true;
      write((params) => {
        params.delete("id");
        params.set("new", kind);
        if (refundOf) params.set("refund", refundOf);
        else params.delete("refund");
      }, mode);
    },

    /** The URL with nothing open, for a link back to the list. */
    hrefWithout() {
      const params = new URLSearchParams(searchParams);
      clearSelection(params);
      return hrefWithParams(pathname, params);
    },

    close() {
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
        return;
      }
      write(clearSelection, "replace");
    },
  };
}
