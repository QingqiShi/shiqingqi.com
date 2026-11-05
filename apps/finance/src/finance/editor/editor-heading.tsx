"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { font } from "@tuja/ui/tokens.stylex";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { MarkBadge } from "./field-label.tsx";
import type { TransactionForm } from "./use-transaction-form.ts";

export function EditorHeading({ form }: { form: TransactionForm }) {
  const {
    data,
    draft,
    locale,
    currency,
    isPlace,
    isExpected,
    heading,
    kindNames,
    categoryName,
    labelMark,
  } = form;
  const headlineMinor = parseMoney(draft.amountText, currency);
  const headlineAmount =
    headlineMinor === null
      ? draft.amountText
      : formatMoney(
          draft.kind === "transfer"
            ? Math.abs(headlineMinor)
            : Math.abs(headlineMinor) *
                (draft.kind === "income" || draft.refund ? 1 : -1),
          currency,
          locale,
          { signDisplay: "exceptZero" },
        );
  const accountLabel = (accountId: string | null) =>
    accountId === null
      ? ""
      : (data.lookups.accountLabelById.get(accountId) ?? "");
  const draftCategory =
    draft.categoryId === null
      ? undefined
      : data.lookups.categoryById.get(draft.categoryId);
  const headlineName =
    draft.kind === "transfer"
      ? [accountLabel(draft.accountId), accountLabel(draft.toAccountId)]
          .filter((part) => part !== "")
          .join(" → ")
      : draft.payeeName.trim() ||
        draft.note.trim() ||
        (draftCategory ? categoryName(draftCategory) : kindNames[draft.kind]);
  const kindMark = labelMark("kind");

  return isPlace ? (
    <h2
      id="finance-editor-heading"
      tabIndex={-1}
      css={[stack.tight, a11y.focusRing, styles.headline]}
    >
      <span css={[typeRole.h1, typeModifier.numeric, styles.headlineAmount]}>
        {headlineAmount}
      </span>
      <span css={[cluster.tight, typeRole.body, styles.headlineName]}>
        <span>{headlineName}</span>
        {isExpected ? (
          <Badge size="sm" intent="neutral">
            {t({ en: "Expected", zh: "待确认" })}
          </Badge>
        ) : null}
      </span>
    </h2>
  ) : (
    <div css={cluster.tight}>
      <h2
        id="finance-editor-heading"
        tabIndex={-1}
        css={[typeRole.h4, a11y.focusRing]}
      >
        {heading}
      </h2>
      {kindMark ? <MarkBadge mark={kindMark} /> : null}
    </div>
  );
}

const styles = stylex.create({
  headline: {
    margin: 0,
  },
  headlineAmount: {
    fontWeight: font.weight_7,
  },
  headlineName: {
    fontWeight: font.weight_5,
  },
});
