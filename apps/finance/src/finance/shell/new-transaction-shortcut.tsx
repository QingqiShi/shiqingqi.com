"use client";

import { useColumnOpen } from "../navigation/column-link.tsx";
import { readNewTransaction } from "../navigation/finance-href.ts";
import { isShortcutKey } from "./is-shortcut-key.ts";
import { useNewTransactionHref } from "./use-new-transaction-href.ts";
import { useWindowKeydown } from "./use-window-keydown.ts";

/**
 * The `n` key on every Finance screen: it opens what the Add action opens,
 * a blank expense in a sheet over the screen.
 */
export function NewTransactionShortcut() {
  const open = useColumnOpen();
  const href = useNewTransactionHref();

  useWindowKeydown((event) => {
    if (event.key !== "n" || !isShortcutKey(event)) return;
    if (readNewTransaction(new URLSearchParams(window.location.search))) {
      return;
    }
    event.preventDefault();
    open(href);
  });

  return null;
}
