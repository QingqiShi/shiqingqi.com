import type { SupportedLocale } from "@tuja/i18n/types";
import { useLocale } from "@tuja/i18n/use-locale";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { financeHref, type FinanceDestination } from "./finance-href.ts";

const OPENED_KEY = "financeOpened";

/**
 * How an entry goes into the history: `push` adds one, `open` adds one that
 * a close goes back from, and `replace` changes this one.
 */
type EntryWrite = "push" | "open" | "replace";

/** Whether `open` made this history entry, so that a close goes back from it. */
export function isOpenedEntry() {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && OPENED_KEY in state;
}

/**
 * Writes `href` into the history in the browser alone, when it only changes
 * the query of the screen that shows, because the Finance screens draw from
 * the Replica and need no request to the server. Returns false, and writes
 * nothing, when `href` opens another screen, which the router must load.
 * The mark of an entry that `open` made stays through a `replace`, in
 * `history.state`, so every screen and the shell share it.
 */
export function writeInBrowser(href: string, write: EntryWrite): boolean {
  const url = new URL(href, window.location.href);
  if (
    url.origin !== window.location.origin ||
    url.pathname !== window.location.pathname
  ) {
    return false;
  }
  const opened = write === "replace" ? isOpenedEntry() : write === "open";
  const state = opened ? { [OPENED_KEY]: true } : null;
  if (write === "replace") window.history.replaceState(state, "", url.href);
  else window.history.pushState(state, "", url.href);
  return true;
}

/** Goes to Finance destinations, and owns how each one goes into the history. */
export interface FinanceNavigator {
  /** Goes to `to` in a new history entry. */
  push: (to: FinanceDestination) => void;
  /** Opens `to` in a new history entry that `close` goes back from, so Back closes it too. */
  open: (to: FinanceDestination) => void;
  /** Changes this history entry to `to`. An entry that `open` made stays one. */
  replace: (to: FinanceDestination) => void;
  /** Goes back from an entry that `open` made, or else replaces this entry with `to`. */
  close: (to: FinanceDestination) => void;
}

type FinanceRouter = Pick<AppRouterInstance, "push" | "replace">;

export function financeNavigator(
  router: FinanceRouter,
  locale: SupportedLocale,
): FinanceNavigator {
  const go = (to: FinanceDestination, write: EntryWrite) => {
    const target = financeHref(to, locale);
    if (writeInBrowser(target, write)) return;
    if (write === "replace") router.replace(target);
    else router.push(target);
  };
  return {
    push: (to) => {
      go(to, "push");
    },
    open: (to) => {
      go(to, "open");
    },
    replace: (to) => {
      go(to, "replace");
    },
    close: (to) => {
      if (isOpenedEntry()) window.history.back();
      else go(to, "replace");
    },
  };
}

/** The Finance navigator, with the router and the locale of the page. */
export function useFinanceNavigator(): FinanceNavigator {
  return financeNavigator(useRouter(), useLocale());
}
