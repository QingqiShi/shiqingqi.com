import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { align, flex } from "@tuja/ui/primitives/flex.stylex";
import { plainList, truncate } from "@tuja/ui/primitives/layout.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font, rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import type { TransactionRow } from "../sync/row-schemas.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";
import { transactionFaceTokens } from "./transaction-face.stylex.ts";

interface TransactionFaceProps {
  icon: ReactNode;
  title: string;
  amount: string;
  amountMuted?: boolean;
  subtitle: string;
  trailing?: ReactNode;
  /** The lines under the subtitle. Leave it out when there are none: a face of only a title centres the title on its icon. */
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
  const hasDetail =
    subtitle !== "" || (children !== undefined && children !== null);
  const titleText = (
    <span css={[typeRole.body, truncate.base, styles.title]}>{title}</span>
  );
  const amountText = (
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
  );
  const trailingText = hasTrailing ? (
    <span
      css={[
        flex.row,
        typeRole.caption,
        typeModifier.numeric,
        styles.second,
        styles.trailing,
      ]}
    >
      {trailing}
    </span>
  ) : null;
  return (
    <span
      css={[flex.row, plainList.row, styles.face, hasDetail && align.start]}
    >
      <span
        css={[
          corner.radius_round,
          flex.center,
          styles.icon,
          hasDetail && styles.iconOnHead,
        ]}
        aria-hidden
      >
        {icon}
      </span>
      {hasDetail ? (
        <span css={[flex.col, styles.main]}>
          <span css={[flex.between, styles.line]}>
            {titleText}
            {amountText}
          </span>
          <span css={[flex.row, align.start, styles.line]}>
            <span css={[flex.col, styles.main]}>
              {subtitle === "" ? null : (
                <span css={[typeRole.bodySmall, truncate.base, styles.muted]}>
                  {subtitle}
                </span>
              )}
              {children}
            </span>
            {trailingText}
          </span>
        </span>
      ) : (
        <span css={[flex.between, styles.main, styles.line]}>
          {titleText}
          <span css={[flex.col, align.end, styles.end]}>
            {amountText}
            {trailingText}
          </span>
        </span>
      )}
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
    paddingBlock: transactionFaceTokens.paddingBlock,
    minInlineSize: 0,
  },
  icon: {
    flexShrink: 0,
    inlineSize: transactionFaceTokens.icon,
    blockSize: transactionFaceTokens.icon,
    backgroundColor: color.bgSurfaceSunken,
    fontSize: controlSize._5,
  },
  iconOnHead: {
    marginBlockStart: transactionFaceTokens.iconOffset,
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
    minBlockSize: transactionFaceTokens.secondLine,
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
  end: {
    flexShrink: 0,
  },
  trailing: {
    flexShrink: 0,
    color: color.fgMuted,
  },
});
