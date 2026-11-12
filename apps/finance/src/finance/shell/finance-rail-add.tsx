"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { NewTransactionLink } from "./finance-add-button.tsx";
import { useNewTransactionHref } from "./use-new-transaction-href.ts";

/**
 * The Add action at the top of the sidebar, `labelled`, and of the rail of
 * icons. It opens what `FinanceAddButton` opens.
 */
export function FinanceRailAdd({ labelled = false }: { labelled?: boolean }) {
  const href = useNewTransactionHref();
  const label = t({ en: "Add", zh: "记一笔" });

  return (
    <Button
      href={href}
      linkComponent={NewTransactionLink}
      look="primary"
      size={labelled ? "md" : "lg"}
      icon={<PlusIcon weight="bold" />}
      aria-label={labelled ? undefined : label}
      aria-keyshortcuts="n"
      css={labelled && styles.wide}
    >
      {labelled ? label : null}
    </Button>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
