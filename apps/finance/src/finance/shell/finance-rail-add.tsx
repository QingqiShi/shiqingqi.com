"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { NewTransactionLink } from "./finance-add-button.tsx";
import { useNewTransactionHref } from "./use-new-transaction-href.ts";

/**
 * The Add action at the top of the rail, where the rail shows. It opens
 * what `FinanceAddButton` opens.
 */
export function FinanceRailAdd() {
  const href = useNewTransactionHref();

  return (
    <Button
      href={href}
      linkComponent={NewTransactionLink}
      look="primary"
      size="lg"
      icon={<PlusIcon weight="bold" />}
      aria-label={t({ en: "Add", zh: "记一笔" })}
      aria-keyshortcuts="n"
    />
  );
}
