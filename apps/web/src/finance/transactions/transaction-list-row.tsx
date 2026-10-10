"use client";

import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CloudArrowUpIcon } from "@phosphor-icons/react/dist/ssr/CloudArrowUp";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  color,
  controlSize,
  font,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { memo, type MouseEvent } from "react";
import { t } from "#src/i18n.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type {
  CategoryRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import { ConfidenceBadge } from "./confidence-badge.tsx";
import { REVIEW_CONFIDENCE } from "./review-confidence.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";

export interface TransactionRowActions {
  hrefFor: (id: string) => string;
  onOpen: (id: string) => void;
  onConfirm: (row: TransactionRow) => void;
  onSkip: (row: TransactionRow) => void;
  onLooksRight: (row: TransactionRow) => void;
  onRecategorise: (row: TransactionRow, categoryId: string) => void;
}

interface TransactionListRowProps {
  row: TransactionRow;
  entries: readonly EntryRow[];
  tagIds: readonly string[];
  lookups: TransactionLookups;
  baseCurrency: string;
  locale: string;
  today: string;
  isSelected: boolean;
  isPending: boolean;
  /** Shows the Review controls: the confidence, "Looks right" and the Category picker. */
  reviewMode: boolean;
  categoriesOfKind: readonly CategoryRow[];
  actions: TransactionRowActions;
}

function isPlainClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function TransactionListRowView({
  row,
  entries,
  tagIds,
  lookups,
  baseCurrency,
  locale,
  today,
  isSelected,
  isPending,
  reviewMode,
  categoriesOfKind,
  actions,
}: TransactionListRowProps) {
  const category =
    row.categoryId === null
      ? undefined
      : lookups.categoryById.get(row.categoryId);
  const payee =
    row.payeeId === null ? undefined : lookups.payeeById.get(row.payeeId);
  const isTransfer = row.kind === "transfer";
  const accountLabel = (accountId: string) =>
    lookups.accountLabelById.get(accountId) ?? "";
  const from = isTransfer
    ? (entries.find((entry) => entry.amountMinor < 0) ?? entries.at(0))
    : entries.at(0);
  const to = isTransfer ? entries.find((entry) => entry !== from) : undefined;

  const transferLabel = t({ en: "Transfer", zh: "转账" });
  const categoryName = useCategoryDisplayName();
  const categoryLabel = category ? categoryName(category) : undefined;
  const title = isTransfer
    ? (payee?.name ?? transferLabel)
    : (payee?.name ?? categoryLabel ?? row.note);
  const subtitle = isTransfer
    ? [from && accountLabel(from.accountId), to && accountLabel(to.accountId)]
        .filter(Boolean)
        .join(" → ")
    : [payee ? categoryLabel : undefined, row.note]
        .filter((part) => part !== undefined && part !== "")
        .join(" · ");
  const meta = [
    isTransfer ? "" : from ? accountLabel(from.accountId) : "",
    ...tagIds.map((id) => `#${lookups.tagById.get(id)?.name ?? ""}`),
  ]
    .filter((part) => part !== "" && part !== "#")
    .join("  ");

  const fromAccount = from
    ? lookups.accountById.get(from.accountId)
    : undefined;
  const amount = isTransfer
    ? formatMoney(
        Math.abs(from?.amountMinor ?? 0),
        fromAccount?.currency ?? baseCurrency,
        locale,
      )
    : formatMoney(
        from && fromAccount && fromAccount.currency !== baseCurrency
          ? from.amountMinor
          : row.amountMinor,
        fromAccount?.currency ?? baseCurrency,
        locale,
        { signDisplay: "exceptZero" },
      );
  const emoji =
    row.categoryId === null
      ? ""
      : (lookups.categoryEmojiById.get(row.categoryId) ?? "");
  const initial = (title || "·").trim().slice(0, 1).toUpperCase();
  const isExpected = row.status === "expected";
  const isFuture = isExpected && row.date > today;
  const showReviewBadge = row.needsReview && !reviewMode;
  const confidence = row.aiConfidence;

  return (
    <div css={styles.row} data-transaction-row={row.id}>
      <a
        href={actions.hrefFor(row.id)}
        aria-current={isSelected ? "true" : undefined}
        data-transaction-id={row.id}
        onClick={(event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          actions.onOpen(row.id);
        }}
        css={[
          flex.row,
          selected.quiet,
          corner.radius_3,
          a11y.focusRingInset,
          styles.link,
        ]}
      >
        <span css={[corner.radius_round, flex.center, styles.icon]} aria-hidden>
          {isTransfer ? (
            <ArrowsLeftRightIcon weight="bold" />
          ) : emoji === "" ? (
            <span css={[typeRole.label, styles.initial]}>{initial}</span>
          ) : (
            emoji
          )}
        </span>
        <span css={[flex.col, styles.main]}>
          <span css={[flex.between, styles.line]}>
            <span css={[typeRole.body, truncate.base, styles.title]}>
              {title}
            </span>
            <span css={[typeRole.body, typeModifier.numeric, styles.amount]}>
              {amount}
            </span>
          </span>
          {subtitle !== "" ? (
            <span css={[typeRole.bodySmall, truncate.base, styles.muted]}>
              {subtitle}
            </span>
          ) : null}
          {meta !== "" || isPending || isExpected || showReviewBadge ? (
            <span css={[flex.row, styles.metaLine]}>
              {isExpected ? (
                <Badge intent="info" size="sm">
                  {t({ en: "Expected", zh: "待确认" })}
                </Badge>
              ) : null}
              {showReviewBadge ? (
                <Badge
                  intent={
                    confidence === null || confidence < REVIEW_CONFIDENCE.medium
                      ? "danger"
                      : "warning"
                  }
                  size="sm"
                >
                  {t({ en: "Review", zh: "待审核" })}
                </Badge>
              ) : null}
              {meta !== "" ? (
                <span css={[typeRole.caption, truncate.base, styles.muted]}>
                  {meta}
                </span>
              ) : null}
              {isPending ? (
                <span css={[typeRole.caption, flex.row, styles.pending]}>
                  <CloudArrowUpIcon weight="bold" aria-hidden />
                  <span css={a11y.srOnly}>
                    {t({ en: "Not synced yet", zh: "尚未同步" })}
                  </span>
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </a>
      {isExpected ? (
        <div css={[cluster.tight, styles.actions]}>
          <Button
            size="sm"
            onClick={() => {
              actions.onConfirm(row);
            }}
          >
            {isFuture
              ? t({ en: "Paid today", zh: "今天已付" })
              : t({ en: "Confirm", zh: "确认" })}
          </Button>
          <Button
            size="sm"
            look="ghost"
            onClick={() => {
              actions.onSkip(row);
            }}
          >
            {t({ en: "Skip", zh: "跳过" })}
          </Button>
        </div>
      ) : null}
      {reviewMode && row.needsReview && !isTransfer ? (
        <div css={[cluster.tight, styles.actions]}>
          {confidence === null ? (
            <Badge intent="neutral" size="sm">
              {t({ en: "New payee", zh: "新商家" })}
            </Badge>
          ) : (
            <ConfidenceBadge confidence={confidence} />
          )}
          <label css={styles.selectWrap}>
            <span css={a11y.srOnly}>{t({ en: "Category", zh: "分类" })}</span>
            <select
              value={row.categoryId ?? ""}
              onChange={(event) => {
                if (event.target.value !== "") {
                  actions.onRecategorise(row, event.target.value);
                }
              }}
              css={[
                typeRole.controlCaption,
                corner.radius_round,
                a11y.focusRing,
                styles.select,
              ]}
            >
              {categoriesOfKind.map((option) => (
                <option key={option.id} value={option.id}>
                  {categoryName(option)}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            icon={<CheckIcon weight="bold" />}
            onClick={() => {
              actions.onLooksRight(row);
            }}
          >
            {t({ en: "Looks right", zh: "没问题" })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** One Transaction in the list: what it was, the account, the Tags and the amount, with the actions an Expected or Review row needs. */
export const TransactionListRow = memo(TransactionListRowView);

const styles = stylex.create({
  row: {
    paddingBlock: space._00,
  },
  link: {
    gap: rhythm.item,
    alignItems: "flex-start",
    paddingBlock: space._1,
    paddingInline: space._2,
    color: "inherit",
    textDecoration: "none",
    minInlineSize: 0,
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
  metaLine: {
    gap: rhythm.tight,
    minInlineSize: 0,
  },
  pending: {
    gap: rhythm.inline,
    color: color.fgMuted,
  },
  actions: {
    paddingInlineStart: `calc(2.25rem + ${rhythm.item} + ${space._2})`,
    paddingBlockEnd: space._1,
  },
  selectWrap: {
    display: "inline-flex",
    minInlineSize: 0,
  },
  select: {
    maxInlineSize: "12rem",
    paddingBlock: space._00,
    paddingInline: space._2,
    color: color.fg,
    backgroundColor: {
      default: color.bgControl,
      [pointer.canHover]: { default: null, ":hover": color.bgControlHover },
    },
    borderWidth: 0,
  },
});
