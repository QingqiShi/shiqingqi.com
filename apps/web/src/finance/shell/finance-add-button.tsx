"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import {
  AnchorButton,
  type AnchorButtonLinkProps,
} from "@tuja/ui/components/anchor-button";
import { buttonTokens } from "@tuja/ui/components/button.stylex";
import { usePathname } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { ColumnLink } from "./column-link.tsx";
import { useShownFinancePath } from "./finance-screen-slot.tsx";
import {
  floatingAction,
  floatingActionTokens,
} from "./floating-action.stylex.ts";
import {
  pushOpenedEntry,
  useNewTransactionUrl,
} from "./use-new-transaction-url.ts";

function NewTransactionLink(props: AnchorButtonLinkProps) {
  return <ColumnLink {...props} push={pushOpenedEntry} />;
}

/**
 * The floating Add action below `lg`. It opens a blank expense
 * (`?new=expense`) in a sheet over the screen it is on, which hosts a
 * `NewTransactionSheet`; at `lg` and wider the transactions header holds
 * the action instead. A screen floats it over its content: the `accessory`
 * of a column of a `NavigationSplitView`, or of a `FinancePageColumn`.
 * In the skeleton of a screen that still opens, it opens that screen.
 */
export function FinanceAddButton() {
  const locale = useLocale();
  const pathname = usePathname();
  const url = useNewTransactionUrl();
  const shownPath = useShownFinancePath();
  const href =
    shownPath === normalizePath(pathname)
      ? url.hrefOf({})
      : getLocalePath(`${shownPath}?new=expense`, locale);
  return (
    <div css={styles.narrowOnly}>
      <AnchorButton
        href={href}
        linkComponent={NewTransactionLink}
        look="primary"
        size="lg"
        icon={<PlusIcon weight="bold" />}
        css={[floatingAction.lift, styles.button]}
      >
        {t({ en: "Add", zh: "记一笔" })}
      </AnchorButton>
    </div>
  );
}

const styles = stylex.create({
  narrowOnly: {
    display: { default: "block", [breakpoints.lg]: "none" },
  },
  button: {
    [buttonTokens.height]: floatingActionTokens.blockSize,
  },
});
