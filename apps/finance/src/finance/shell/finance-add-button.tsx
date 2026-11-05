"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { buttonTokens } from "@tuja/ui/components/button.stylex";
import type { LinkSlotProps } from "@tuja/ui/components/link-provider";
import { tabViewQueries } from "@tuja/ui/components/tab-view.stylex";
import { ColumnLink } from "../navigation/column-link.tsx";
import {
  floatingAction,
  floatingActionTokens,
} from "./floating-action.stylex.ts";
import { useNewTransactionHref } from "./use-new-transaction-href.ts";

export function NewTransactionLink(props: LinkSlotProps) {
  return <ColumnLink {...props} opens />;
}

/**
 * The floating Add action, where the tab bar shows. It opens a blank
 * expense (`?new=expense`) in a sheet over the screen it is on, which hosts
 * the sheet of `useTransactionTask`; where the rail shows, `FinanceRailAdd`
 * holds the action instead. A screen floats it over its content: the
 * `accessory` of a column of a `NavigationSplitView`. In the skeleton of a
 * screen that still opens, it opens that screen.
 */
export function FinanceAddButton() {
  const href = useNewTransactionHref();

  return (
    <div css={styles.barOnly}>
      <Button
        href={href}
        linkComponent={NewTransactionLink}
        look="primary"
        size="lg"
        icon={<PlusIcon weight="bold" />}
        aria-keyshortcuts="n"
        css={[floatingAction.lift, styles.button]}
      >
        {t({ en: "Add", zh: "记一笔" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  barOnly: {
    display: { default: "block", [tabViewQueries.rail]: "none" },
  },
  button: {
    [buttonTokens.height]: floatingActionTokens.blockSize,
  },
});
