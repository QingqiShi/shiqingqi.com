"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { buttonTokens } from "@tuja/ui/components/button.stylex";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import {
  floatingAction,
  floatingActionTokens,
} from "./floating-action.stylex.ts";

/**
 * The floating Add action below `lg`. It opens a blank expense in the
 * transactions editor (`?new=expense`); at `lg` and wider the transactions
 * header holds the action instead. A screen floats it over its content:
 * the `accessory` of a column of a `NavigationSplitView`, or of a
 * `FinancePageColumn`.
 */
export function FinanceAddButton() {
  const locale = useLocale();
  return (
    <div css={styles.narrowOnly}>
      <AnchorButton
        href={getLocalePath("/finance/transactions?new=expense", locale)}
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
