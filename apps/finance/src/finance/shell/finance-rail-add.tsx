"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { NewTransactionLink } from "./finance-add-button.tsx";
import { useNewTransactionHref } from "./use-new-transaction-href.ts";

/**
 * The Add action at the top of the rail, where the rail shows: a filled
 * tile in the shape of a destination, its icon over its label. It opens
 * what `FinanceAddButton` opens.
 */
export function FinanceRailAdd() {
  const href = useNewTransactionHref();

  return (
    <AnchorButton
      href={href}
      linkComponent={NewTransactionLink}
      look="primary"
      icon={
        <span css={styles.icon}>
          <PlusIcon weight="bold" />
        </span>
      }
      aria-keyshortcuts="n"
      css={[typeRole.caption, corner.radius_3, styles.tile]}
    >
      {t({ en: "Add", zh: "记一笔" })}
    </AnchorButton>
  );
}

const styles = stylex.create({
  tile: {
    flexDirection: "column",
    gap: rhythm.inline,
    inlineSize: "100%",
    aspectRatio: 1,
    paddingBlock: space._1,
    paddingInlineStart: 0,
    paddingInlineEnd: 0,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingTight,
  },
  icon: {
    display: "inline-flex",
    fontSize: controlSize._5,
  },
});
