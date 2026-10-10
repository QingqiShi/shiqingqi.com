"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { layer } from "@tuja/ui/tokens.stylex";
import { usePathname, useSearchParams } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import {
  floatingAction,
  floatingActionTokens,
} from "./floating-action.stylex.ts";

/**
 * The floating Add action below `lg`, above the tab bar below `md`. It opens a blank expense in the
 * transactions editor (`?new=expense`); at `lg` and wider the transactions
 * header holds the action instead.
 */
export function FinanceAddButton() {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const mode = useSearchParams().get("mode");
  if (current.startsWith("/finance/settings") || mode === "update") return null;
  return (
    <div css={styles.anchor}>
      <AnchorButton
        href={getLocalePath("/finance/transactions?new=expense", locale)}
        look="primary"
        size="lg"
        icon={<PlusIcon weight="bold" />}
        css={floatingAction.lift}
      >
        {t({ en: "Add", zh: "记一笔" })}
      </AnchorButton>
    </div>
  );
}

const styles = stylex.create({
  anchor: {
    display: { default: "block", [breakpoints.lg]: "none" },
    position: "fixed",
    insetBlockEnd: floatingActionTokens.insetBlockEnd,
    insetInlineEnd: pageGutter.inlineEnd,
    zIndex: layer.header,
  },
});
