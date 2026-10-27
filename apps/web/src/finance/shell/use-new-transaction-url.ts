import { usePathname, useSearchParams } from "next/navigation";
import {
  isTransactionKind,
  type TransactionKind,
} from "../transactions/transaction-filters.ts";
import { hrefWithParams } from "./href-with-params.ts";

const OPENED_KEY = "financeOpened";

/**
 * Whether a Finance screen pushed the current history entry to open a
 * Transaction or a new one. Its close then goes back, so the entry does not
 * stay behind the screen. The mark lives in `history.state`, so the Add
 * action and the screen that hosts the editor share it.
 */
export function isOpenedEntry() {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && OPENED_KEY in state;
}

/** Pushes `href` as an entry that a close goes back from. */
export function pushOpenedEntry(href: string) {
  window.history.pushState({ [OPENED_KEY]: true }, "", href);
}

/** Replaces the entry with `href`. An entry that a close goes back from stays one. */
export function replaceEntry(href: string) {
  window.history.replaceState(
    isOpenedEntry() ? { [OPENED_KEY]: true } : null,
    "",
    href,
  );
}

/** Goes back from an opened entry, or else replaces it with `closedHref`. */
export function closeEntry(closedHref: string) {
  if (isOpenedEntry()) window.history.back();
  else window.history.replaceState(null, "", closedHref);
}

/** The new Transaction in `params`: its kind, or null for none, and the Transaction it refunds. */
export function readNewTransaction(params: Pick<URLSearchParams, "get">) {
  const newParam = params.get("new");
  const kind =
    newParam !== null && isTransactionKind(newParam) ? newParam : null;
  return {
    kind,
    refundOfId: kind === null ? null : params.get("refund"),
  };
}

/** Puts a new Transaction of `kind` in `params`, a refund of `refundOf` when it is given. */
export function setNewTransaction(
  params: URLSearchParams,
  kind: TransactionKind,
  refundOf?: string,
) {
  params.set("new", kind);
  if (refundOf) params.set("refund", refundOf);
  else params.delete("refund");
}

/** Takes the new Transaction out of `params`. */
export function deleteNewTransaction(params: URLSearchParams) {
  params.delete("new");
  params.delete("refund");
}

interface NewTransactionTarget {
  /** A new refund of this Transaction. */
  refundOf?: string;
  /** The screen URL to open the editor over, when not the current one. */
  from?: string;
}

/**
 * A new expense over any Finance screen, in the URL: `?new=expense`, with
 * `&refund=<id>` for a refund. The screen keeps the rest of its URL, so a
 * close leaves it as it was. It writes with the History API, which Next's
 * router follows without a server round trip.
 */
export function useNewTransactionUrl() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const hrefOf = ({ refundOf, from }: NewTransactionTarget) => {
    const base =
      from === undefined ? null : new URL(from, window.location.href);
    const params = new URLSearchParams(base?.search ?? searchParams);
    setNewTransaction(params, "expense", refundOf);
    return hrefWithParams(base?.pathname ?? pathname, params);
  };

  return {
    ...readNewTransaction(searchParams),
    /** The URL with the editor open over the screen. */
    hrefOf,

    /** Opens the editor in a new history entry, so back closes it. */
    open: (target: NewTransactionTarget = {}) => {
      pushOpenedEntry(hrefOf(target));
    },

    close: () => {
      const params = new URLSearchParams(window.location.search);
      deleteNewTransaction(params);
      closeEntry(hrefWithParams(pathname, params));
    },
  };
}
