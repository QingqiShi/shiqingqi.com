"use client";

import { CloudArrowUpIcon } from "@phosphor-icons/react/dist/ssr/CloudArrowUp";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";

interface TransactionMetaLineProps {
  meta: string;
  isExpected: boolean;
  showReviewBadge?: boolean;
  isPending?: boolean;
}

/** Whether `TransactionMetaLine` shows anything for these props. */
export function hasMetaLine({
  meta,
  isExpected,
  showReviewBadge = false,
  isPending = false,
}: TransactionMetaLineProps) {
  return meta !== "" || isExpected || showReviewBadge || isPending;
}

/** The line under a Transaction's subtitle: its status badges, the account and the Tags. */
export function TransactionMetaLine({
  meta,
  isExpected,
  showReviewBadge = false,
  isPending = false,
}: TransactionMetaLineProps) {
  if (!hasMetaLine({ meta, isExpected, showReviewBadge, isPending })) {
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
        <Text as="span" look="caption" tone="muted" lines={1}>
          {meta}
        </Text>
      )}
      {isPending ? (
        <Text
          as="span"
          look="caption"
          tone="muted"
          css={[flex.row, styles.pending]}
        >
          <CloudArrowUpIcon weight="bold" aria-hidden />
          <span css={a11y.srOnly}>
            {t({ en: "Not synced yet", zh: "尚未同步" })}
          </span>
        </Text>
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
  pending: {
    gap: rhythm.inline,
  },
});
