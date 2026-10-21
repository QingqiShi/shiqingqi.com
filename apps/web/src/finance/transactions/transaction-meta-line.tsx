"use client";

import { CloudArrowUpIcon } from "@phosphor-icons/react/dist/ssr/CloudArrowUp";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

interface TransactionMetaLineProps {
  meta: string;
  isExpected: boolean;
  showReviewBadge?: boolean;
  isPending?: boolean;
}

/** The line under a Transaction's subtitle: its status badges, the account and the Tags. */
export function TransactionMetaLine({
  meta,
  isExpected,
  showReviewBadge = false,
  isPending = false,
}: TransactionMetaLineProps) {
  if (meta === "" && !isExpected && !showReviewBadge && !isPending) {
    return null;
  }
  return (
    <span
      css={[
        flex.row,
        styles.line,
        (isExpected || showReviewBadge) && styles.withBadge,
      ]}
    >
      {isExpected ? (
        <Badge intent="info" size="sm">
          {t({ en: "Expected", zh: "待确认" })}
        </Badge>
      ) : null}
      {showReviewBadge ? (
        <Badge intent="warning" size="sm">
          {t({ en: "Review", zh: "待审核" })}
        </Badge>
      ) : null}
      {meta === "" ? null : (
        <span css={[typeRole.caption, truncate.base, styles.muted]}>
          {meta}
        </span>
      )}
      {isPending ? (
        <span css={[typeRole.caption, flex.row, styles.pending]}>
          <CloudArrowUpIcon weight="bold" aria-hidden />
          <span css={a11y.srOnly}>
            {t({ en: "Not synced yet", zh: "尚未同步" })}
          </span>
        </span>
      ) : null}
    </span>
  );
}

const styles = stylex.create({
  line: {
    gap: rhythm.tight,
    minInlineSize: 0,
  },
  withBadge: {
    marginBlockStart: rhythm.inline,
  },
  muted: {
    color: color.fgMuted,
  },
  pending: {
    gap: rhythm.inline,
    color: color.fgMuted,
  },
});
