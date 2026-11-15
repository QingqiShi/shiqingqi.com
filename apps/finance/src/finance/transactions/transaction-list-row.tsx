"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { ListRow, type ListRowLinkProps } from "@tuja/ui/components/list-row";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
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
import { ReviewHint } from "./review-hint.tsx";
import { reviewReason } from "./review-reason.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";
import { shownAmount } from "./shown-amount.ts";
import { hasMetaLine, TransactionMetaLine } from "./transaction-meta-line.tsx";
import { useDescribeTransaction } from "./use-describe-transaction.ts";

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
  const reviewing = reviewMode && inReview;
  const showReviewBadge = inReview && !reviewMode;
  const reason = reviewing ? reviewReason(row, entries, lookups) : null;
  const metaLine = { meta, isExpected, showReviewBadge, isPending };

  const expectedActions = isExpected ? (
    <div css={cluster.tight}>
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
  ) : null;

  // Every row in Review gets an answer in place: a Category and "Looks
  // right", "Looks right" alone for a transfer, or a way to the account
  // that a transfer on In transit still needs.
  const reviewActions = reviewing ? (
    <div css={[cluster.tight, styles.reviewActions]}>
      {isTransfer ? null : (
        <Select
          size="sm"
          label={t({ en: "Category", zh: "分类" })}
          labelHidden
          value={row.categoryId ?? ""}
          options={categoriesOfKind.map((option) => ({
            value: option.id,
            label: categoryName(option),
          }))}
          onChange={(event) => {
            if (event.target.value !== "") {
              actions.onRecategorise(row, event.target.value);
            }
          }}
          css={styles.select}
        />
      )}
      {reason?.type === "inTransit" ? (
        <Button
          size="sm"
          icon={<ArrowRightIcon weight="bold" />}
          onClick={() => {
            actions.onOpen(row.id);
          }}
        >
          {t({ en: "Choose account", zh: "选择账户" })}
        </Button>
      ) : (
        <Button
          size="sm"
          icon={<CheckIcon weight="bold" />}
          onClick={() => {
            actions.onLooksRight(row);
          }}
        >
          {t({ en: "Looks right", zh: "没问题" })}
        </Button>
      )}
    </div>
  ) : null;

  return (
    <div data-transaction-row={row.id} css={typeModifier.verbatim}>
      <TransactionLinkContext value={{ id: row.id, onOpen: actions.onOpen }}>
        <ListRow
          href={actions.hrefFor(row.id)}
          linkComponent={TransactionLink}
          aria-current={isSelected ? "true" : undefined}
          caret={false}
          // A row in Review stacks its lines, so that the name and the amount
          // lead and the reason and the answer share one line under them.
          columns={!reviewMode}
          leading={icon}
          leadingShape="circle"
          detail={subtitle}
          extra={
            hasMetaLine(metaLine) ? <TransactionMetaLine {...metaLine} /> : null
          }
          value={
            isExpected ? (
              <Text as="span" tone="muted">
                {amount}
              </Text>
            ) : (
              amount
            )
          }
          valueDetail={countedText}
          below={
            reviewActions ? (
              <div css={[cluster.item, styles.reviewBar]}>
                {reason === null ? null : <ReviewHint reason={reason} />}
                {expectedActions}
                {reviewActions}
              </div>
            ) : (
              expectedActions
            )
          }
        >
          {title}
        </ListRow>
      </TransactionLinkContext>
    </div>
  );
}

const styles = stylex.create({
  select: {
    maxInlineSize: "12rem",
  },
  // The reason on the start and the answer on the end, as wide as the row,
  // so the buttons of every row line up under the amounts. Where both do not
  // fit, the answer wraps under the reason.
  reviewBar: {
    justifySelf: "stretch",
    justifyContent: "space-between",
    rowGap: rhythm.tight,
  },
  reviewActions: {
    flexWrap: "nowrap",
    marginInlineStart: "auto",
  },
});
