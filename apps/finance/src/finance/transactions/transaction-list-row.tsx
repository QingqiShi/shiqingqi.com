"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { ListRow, type ListRowLinkProps } from "@tuja/ui/components/list-row";
import { listRowSizes, listRowTokens } from "@tuja/ui/components/list.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { createContext, type MouseEvent, use } from "react";
import { formatMoney } from "../domain/money/format-money.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type {
  CategoryRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import { countedLine } from "./counted-line.ts";
import { isInReview } from "./is-in-review.ts";
import { reviewReason, type ReviewReason } from "./review-reason.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";
import { shownAmount } from "./shown-amount.ts";
import { hasMetaLine, TransactionMetaLine } from "./transaction-meta-line.tsx";
import { useDescribeTransaction } from "./use-describe-transaction.ts";
import { useReviewReasonText } from "./use-review-reason-text.ts";

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
  /** What the Transaction adds to its day's totals; see `selectTransactionAmounts`. */
  countedMinor: number;
  tagIds: readonly string[];
  lookups: TransactionLookups;
  baseCurrency: string;
  locale: string;
  today: string;
  isSelected: boolean;
  isPending: boolean;
  /** Shows the Review controls: the reason, "Looks right" and the Category picker. */
  reviewMode: boolean;
  categoriesOfKind: readonly CategoryRow[];
  actions: TransactionRowActions;
}

function ReviewReasonCaption({ reason }: { reason: ReviewReason }) {
  const reasonText = useReviewReasonText();
  return (
    <span css={[typeRole.caption, styles.muted]}>{reasonText(reason)}</span>
  );
}

const TransactionLinkContext = createContext<{
  id: string;
  onOpen: (id: string) => void;
} | null>(null);

/** The row's link: a plain click opens the Transaction in the list's own way, and a modified click is left to the browser. */
function TransactionLink(props: ListRowLinkProps) {
  const target = use(TransactionLinkContext);
  return (
    <a
      {...props}
      data-transaction-id={target?.id}
      onClick={(event) => {
        if (target === null || !isPlainClick(event)) return;
        event.preventDefault();
        target.onOpen(target.id);
      }}
    />
  );
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

/** One Transaction in the list: what it was, the account, the Tags and the amount, with the actions an Expected or Review row needs. */
export function TransactionListRow({
  row,
  entries,
  countedMinor,
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
  const describe = useDescribeTransaction(lookups);
  const { title, subtitle, meta, icon } = describe(row, {
    entries,
    tagIds,
    accountId: null,
  });
  const isTransfer = row.kind === "transfer";
  const categoryName = useCategoryDisplayName();

  const shown = shownAmount(row, entries, lookups.accountById, baseCurrency);
  const amount = isTransfer
    ? formatMoney(Math.abs(shown.amountMinor), shown.currency, locale)
    : formatMoney(shown.amountMinor, shown.currency, locale, {
        signDisplay: "exceptZero",
      });
  const counted = countedLine(
    row,
    entries,
    countedMinor,
    shown,
    lookups.accountById,
    baseCurrency,
  );
  const shareText = t({ en: "Your share {amount}", zh: "你的份额 {amount}" });
  const incomeAfterRepaymentText = t({
    en: "Income {amount} · after repayment",
    zh: "收入 {amount} · 已扣除还款",
  });
  const countsText = t({ en: "Counts {amount}", zh: "计入 {amount}" });
  const notCountedText =
    row.kind === "income"
      ? t({ en: "Repayment · not income", zh: "还款 · 不计收入" })
      : t({ en: "Owed back · not spending", zh: "待收回 · 不计支出" });
  const size = (amountMinor: number) =>
    formatMoney(Math.abs(amountMinor), baseCurrency, locale);
  const countedText = (() => {
    switch (counted?.type) {
      case undefined:
        return undefined;
      case "notCounted":
        return notCountedText;
      case "share":
        return shareText.replace("{amount}", size(counted.amountMinor));
      case "incomeAfterRepayment":
        return incomeAfterRepaymentText.replace(
          "{amount}",
          size(counted.amountMinor),
        );
      case "counts":
        return countsText.replace(
          "{amount}",
          formatMoney(counted.amountMinor, baseCurrency, locale, {
            signDisplay: "exceptZero",
          }),
        );
      case "converted":
        return `≈ ${size(counted.amountMinor)}`;
    }
  })();
  const isExpected = row.status === "expected";
  const inReview = isInReview(row, entries, lookups.accountById, today);
  const showReviewBadge = inReview && !reviewMode;
  const reason =
    reviewMode && inReview ? reviewReason(row, entries, lookups) : null;
  const metaLine = { meta, isExpected, showReviewBadge, isPending };

  return (
    <div data-transaction-row={row.id} css={typeModifier.verbatim}>
      <TransactionLinkContext value={{ id: row.id, onOpen: actions.onOpen }}>
        <ListRow
          href={actions.hrefFor(row.id)}
          linkComponent={TransactionLink}
          aria-current={isSelected ? "true" : undefined}
          caret={false}
          leading={icon}
          leadingShape="circle"
          detail={subtitle}
          extra={
            reason === null && !hasMetaLine(metaLine) ? null : (
              <>
                {reason === null ? null : (
                  <ReviewReasonCaption reason={reason} />
                )}
                <TransactionMetaLine {...metaLine} />
              </>
            )
          }
          value={isExpected ? <span css={styles.muted}>{amount}</span> : amount}
          valueDetail={countedText}
        >
          {title}
        </ListRow>
      </TransactionLinkContext>
      {isExpected ? (
        <div css={[cluster.tight, styles.actions]}>
          <Button
            size="sm"
            onClick={() => {
              actions.onConfirm(row);
            }}
          >
            {t({ en: "Confirm", zh: "确认" })}
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
      {reviewMode && inReview && !isTransfer ? (
        <div css={[cluster.tight, styles.actions]}>
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

const styles = stylex.create({
  muted: {
    color: color.mutedForeground,
  },
  actions: {
    paddingInlineStart: `calc(${listRowSizes.media_md} + ${rhythm.item} + ${listRowTokens.rowPaddingInline})`,
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
    color: color.foreground,
    backgroundColor: {
      default: color.card,
      [pointer.canHover]: { default: null, ":hover": color.accent },
    },
    borderWidth: 0,
  },
});
