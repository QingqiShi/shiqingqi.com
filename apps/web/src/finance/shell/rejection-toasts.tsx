"use client";

import { t } from "@tuja/i18n";
import { useToast } from "@tuja/ui/components/toast-provider";
import { useEffect } from "react";
import { useReplicaStore } from "../replica/use-replica-store.ts";

const TRANSACTION_MUTATIONS = new Set([
  "createTransaction",
  "updateTransaction",
  "deleteTransaction",
  "restoreTransaction",
  "confirmExpected",
  "skipExpected",
]);

/** Tells the visitor once when the server turned down a change made here. */
export function RejectionToasts() {
  const store = useReplicaStore();
  const showToast = useToast();
  const transactionDeleted = t({
    en: "That transaction was deleted",
    zh: "这笔交易已被删除",
  });
  const itemDeleted = t({ en: "That item was deleted", zh: "该项已被删除" });
  const notSaved = t({
    en: "A change could not be saved",
    zh: "有一项更改未能保存",
  });

  useEffect(
    () =>
      store.onRejection((rejection) => {
        const message =
          rejection.reason === "deleted"
            ? TRANSACTION_MUTATIONS.has(rejection.mutation.name)
              ? transactionDeleted
              : itemDeleted
            : notSaved;
        showToast({ message });
      }),
    [store, showToast, transactionDeleted, itemDeleted, notSaved],
  );

  return null;
}
