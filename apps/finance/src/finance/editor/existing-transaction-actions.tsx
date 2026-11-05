"use client";

import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { RepeatIcon } from "@phosphor-icons/react/dist/ssr/Repeat";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { applyAll } from "../replica/apply-with-undo.ts";
import { canPayInInstalments } from "./build-instalment-plan.ts";
import { InstalmentPanel } from "./instalment-panel.tsx";
import type { TransactionForm } from "./use-transaction-form.ts";

interface ExistingTransactionActionsProps {
  form: TransactionForm;
  makeRule: () => void;
}

export function ExistingTransactionActions({
  form,
  makeRule,
}: ExistingTransactionActionsProps) {
  const {
    data,
    host,
    store,
    undoable,
    existing,
    existingEntries,
    isExpected,
    remove,
  } = form;
  const [instalmentsOpen, setInstalmentsOpen] = useState(false);

  return (
    <>
      {existing && !isExpected ? (
        <div css={cluster.tight}>
          {existing.kind === "expense" &&
          (existingEntries.at(0)?.amountMinor ?? 0) < 0 ? (
            <Button
              size="sm"
              look="outline"
              icon={<ArrowUUpLeftIcon weight="bold" />}
              onClick={() => {
                host.refund(existing.id);
              }}
            >
              {t({ en: "Refund", zh: "退款" })}
            </Button>
          ) : null}
          {existing.ruleId === null ? (
            <Button
              size="sm"
              look="outline"
              icon={<RepeatIcon weight="bold" />}
              onClick={makeRule}
            >
              {t({ en: "Make this a rule", zh: "设为周期规则" })}
            </Button>
          ) : null}
          {canPayInInstalments(existing, existingEntries) &&
          !instalmentsOpen ? (
            <Button
              size="sm"
              look="outline"
              icon={<CalendarDotsIcon weight="bold" />}
              onClick={() => {
                setInstalmentsOpen(true);
              }}
            >
              {t({ en: "Pay in instalments", zh: "分期付款" })}
            </Button>
          ) : null}
          <Button
            size="sm"
            look="ghost"
            icon={<TrashIcon weight="bold" />}
            onClick={remove}
          >
            {t({ en: "Delete", zh: "删除" })}
          </Button>
        </div>
      ) : null}

      {existing && instalmentsOpen ? (
        <InstalmentPanel
          data={data}
          transaction={existing}
          entries={existingEntries}
          tagIds={data.tagIdsByTransaction.get(existing.id) ?? []}
          onCreate={(mutations, undo, summary) => {
            try {
              applyAll(store, mutations);
            } catch {
              return false;
            }
            setInstalmentsOpen(false);
            undoable(summary, undo);
            return true;
          }}
          onCancel={() => {
            setInstalmentsOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
