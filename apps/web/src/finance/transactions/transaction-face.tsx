import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  color,
  controlSize,
  font,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import type { TransactionRow } from "../sync/row-schemas.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";

interface TransactionFaceProps {
  icon: ReactNode;
  title: string;
  amount: string;
  amountMuted?: boolean;
  subtitle: string;
  trailing?: ReactNode;
  children?: ReactNode;
}

export function TransactionFace({
  icon,
  title,
  amount,
  amountMuted = false,
  subtitle,
  trailing,
  children,
}: TransactionFaceProps) {
  // A row with a trailing slot is always two lines high, also when the slot is
  // empty. Thus the amounts and the trailing content of a list stay in line.
  const hasTrailing = trailing !== undefined;
  return (
    <span css={[flex.row, styles.face, hasTrailing && styles.twoLines]}>
      <span css={[corner.radius_round, flex.center, styles.icon]} aria-hidden>
        {icon}
      </span>
      <span css={[flex.col, styles.main]}>
        <span css={[flex.between, styles.line]}>
          <span css={[typeRole.body, truncate.base, styles.title]}>
            {title}
          </span>
          <span
            css={[
              typeRole.body,
              typeModifier.numeric,
              styles.amount,
              amountMuted && styles.muted,
            ]}
          >
            {amount}
          </span>
        </span>
        {subtitle !== "" || hasTrailing ? (
          <span css={[flex.between, styles.line, styles.second]}>
            <span css={[typeRole.bodySmall, truncate.base, styles.muted]}>
              {subtitle}
            </span>
            {hasTrailing ? (
              <span
                css={[
                  flex.row,
                  typeRole.caption,
                  typeModifier.numeric,
                  styles.trailing,
                ]}
              >
                {trailing}
              </span>
            ) : null}
          </span>
        ) : null}
        {children}
      </span>
    </span>
  );
}

export function transactionIcon(
  transaction: Pick<TransactionRow, "kind" | "categoryId">,
  lookups: Pick<TransactionLookups, "categoryEmojiById">,
  title: string,
): ReactNode {
  if (transaction.kind === "transfer") {
    return <ArrowsLeftRightIcon weight="bold" />;
  }
  const emoji =
    transaction.categoryId === null
      ? undefined
      : lookups.categoryEmojiById.get(transaction.categoryId);
  if (emoji !== undefined && emoji !== "") return emoji;
  return (
    <span css={[typeRole.label, styles.initial]}>
      {(title || "·").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

const styles = stylex.create({
  face: {
    gap: rhythm.item,
    alignItems: "flex-start",
    paddingBlock: space._1,
    paddingInline: space._2,
    minInlineSize: 0,
  },
  twoLines: {
    alignItems: "center",
  },
  icon: {
    flexShrink: 0,
    inlineSize: "2.25rem",
    blockSize: "2.25rem",
    backgroundColor: color.bgSurfaceSunken,
    fontSize: controlSize._5,
  },
  initial: {
    color: color.fgMuted,
  },
  main: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  line: {
    gap: rhythm.tight,
    minInlineSize: 0,
  },
  second: {
    minBlockSize: `calc(${font.uiBodySmall} * ${font.lineHeight_4})`,
  },
  title: {
    fontWeight: font.weight_5,
    minInlineSize: 0,
  },
  amount: {
    flexShrink: 0,
    fontWeight: font.weight_5,
  },
  muted: {
    color: color.fgMuted,
  },
  trailing: {
    flexShrink: 0,
    color: color.fgMuted,
  },
});
