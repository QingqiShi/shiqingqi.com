import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import type { ReactNode } from "react";
import type { TransactionRow } from "../sync/row-schemas.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";

/**
 * What marks a Transaction in a list, hidden from a screen reader: arrows for
 * a transfer, else its Category's emoji, else the first letter of its title.
 */
export function transactionIcon(
  transaction: Pick<TransactionRow, "kind" | "categoryId">,
  lookups: Pick<TransactionLookups, "categoryEmojiById">,
  title: string,
): ReactNode {
  return (
    <span aria-hidden css={styles.icon}>
      {iconOf(transaction, lookups, title)}
    </span>
  );
}

function iconOf(
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
  icon: {
    display: "flex",
  },
  initial: {
    color: color.mutedForeground,
  },
});
