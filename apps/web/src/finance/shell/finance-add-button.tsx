"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { accessoryQueries } from "@tuja/ui/components/accessory.stylex";
import {
  AnchorButton,
  type AnchorButtonLinkProps,
} from "@tuja/ui/components/anchor-button";
import { buttonTokens } from "@tuja/ui/components/button.stylex";
import { tabBarTokens } from "@tuja/ui/components/tab-bar.stylex";
import { controlSize, rhythm } from "@tuja/ui/tokens.stylex";
import { usePathname, useSearchParams } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { ColumnLink } from "../navigation/column-link.tsx";
import { financeHref } from "../navigation/finance-href.ts";
import { useShownFinancePath } from "./finance-screen-slot.tsx";
import {
  floatingAction,
  floatingActionTokens,
} from "./floating-action.stylex.ts";

function NewTransactionLink(props: AnchorButtonLinkProps) {
  return <ColumnLink {...props} opens />;
}

/**
 * The floating Add action below `lg`. It opens a blank expense
 * (`?new=expense`) in a sheet over the screen it is on, which hosts the
 * sheet of `useTransactionTask`; at `lg` and wider the transactions header
 * holds the action instead. A screen floats it over its content: the
 * `accessory` of a column of a `NavigationSplitView`, or of a
 * `FinancePageColumn`. Where the accessory puts it in the rail of the safe
 * area at the side, it is a rail item: its icon over its label. In the
 * skeleton of a screen that still opens, it opens that screen.
 */
export function FinanceAddButton() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shownPath = useShownFinancePath();
  const opening = shownPath !== normalizePath(pathname);
  const href = financeHref(
    { screen: "current", newTransaction: { kind: "expense" } },
    locale,
    opening
      ? { pathname: getLocalePath(shownPath, locale), search: "" }
      : { pathname, search: searchParams.toString() },
  );

  const label = t({ en: "Add", zh: "记一笔" });

  return (
    <div css={styles.narrowOnly}>
      <div css={styles.floatingOnly}>
        <AnchorButton
          href={href}
          linkComponent={NewTransactionLink}
          look="primary"
          size="lg"
          icon={<PlusIcon weight="bold" />}
          css={[floatingAction.lift, styles.button]}
        >
          {label}
        </AnchorButton>
      </div>
      <div css={styles.railOnly}>
        <AnchorButton
          href={href}
          linkComponent={NewTransactionLink}
          look="primary"
          size="sm"
          icon={
            <span css={styles.railIcon}>
              <PlusIcon weight="bold" />
            </span>
          }
          css={[floatingAction.lift, styles.railButton]}
        >
          {label}
        </AnchorButton>
      </div>
    </div>
  );
}

const styles = stylex.create({
  narrowOnly: {
    display: { default: "block", [breakpoints.lg]: "none" },
  },
  floatingOnly: {
    display: { default: "block", [accessoryQueries.rail]: "none" },
  },
  railOnly: {
    display: { default: "none", [accessoryQueries.rail]: "block" },
  },
  button: {
    [buttonTokens.height]: floatingActionTokens.blockSize,
  },
  // A rail item, as tall as the tab bar beside it.
  railButton: {
    [buttonTokens.height]: tabBarTokens.blockSize,
    [buttonTokens.paddingInline]: "0px",
    flexDirection: "column",
    gap: rhythm.inline,
    inlineSize: tabBarTokens.blockSize,
    paddingInlineStart: 0,
  },
  railIcon: {
    display: "inline-flex",
    fontSize: controlSize._5,
  },
});
