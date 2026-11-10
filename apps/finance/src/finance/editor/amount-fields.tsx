"use client";

import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { font } from "@tuja/ui/tokens.stylex";
import { currencySymbol } from "../accounts/currency-symbol.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { usualTransferSource } from "./draft-of-transaction.ts";
import { FieldLabel } from "./field-label.tsx";
import type { TransactionForm } from "./use-transaction-form.ts";

export function AmountFields({ form }: { form: TransactionForm }) {
  const {
    data,
    draft,
    locale,
    currency,
    transactionId,
    touched,
    isNew,
    amountRef,
    needsToAmount,
    shownOf,
    shownMoney,
    errorOf,
    update,
    convertedToAmount,
    labelMark,
  } = form;
  const payeeHistory =
    draft.payeeId === null ? [] : (data.byPayee.get(draft.payeeId) ?? []);
  const refundCandidates = payeeHistory
    .filter(
      (row) =>
        row.kind === "expense" &&
        shownOf(row).amountMinor < 0 &&
        row.status === "posted" &&
        row.id !== transactionId,
    )
    .slice(0, 10);
  const amountLabel =
    draft.kind === "transfer"
      ? t({ en: "Amount sent", zh: "转出金额" })
      : draft.refund
        ? t({ en: "Amount refunded", zh: "退款金额" })
        : t({ en: "Amount", zh: "金额" });

  return (
    <div css={stack.item}>
      <SegmentedControl
        aria-label={t({ en: "Kind", zh: "类型" })}
        fullWidth
        size="sm"
        value={draft.kind}
        options={[
          { value: "expense", label: t({ en: "Expense", zh: "支出" }) },
          { value: "income", label: t({ en: "Income", zh: "收入" }) },
          { value: "transfer", label: t({ en: "Transfer", zh: "转账" }) },
        ]}
        onChange={(kind) => {
          const category =
            draft.categoryId === null
              ? undefined
              : data.lookups.categoryById.get(draft.categoryId);
          const source =
            kind === "transfer" && isNew && !touched.has("account")
              ? usualTransferSource(data)
              : null;
          update(
            {
              kind,
              categoryId: category?.kind === kind ? category.id : null,
              refund: kind === "expense" ? draft.refund : false,
              ...(source === null ? {} : { accountId: source }),
            },
            ["kind"],
          );
        }}
      />

      <div css={stack.tight}>
        <FieldLabel mark={labelMark("amount")}>{amountLabel}</FieldLabel>
        <TextField
          ref={amountRef}
          label={amountLabel}
          labelHidden
          size="lg"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          leading={currencySymbol(currency, locale)}
          value={draft.amountText}
          error={errorOf("amount")}
          controlCss={[typeModifier.numeric, styles.amount]}
          onChange={(event) => {
            const amountText = event.target.value;
            update(
              needsToAmount && !touched.has("toAmount")
                ? {
                    amountText,
                    toAmountText: convertedToAmount(
                      amountText,
                      draft.toAccountId,
                    ),
                  }
                : { amountText },
              ["amount"],
            );
          }}
        />
      </div>

      {draft.kind === "expense" ? (
        <div css={stack.tight}>
          <div>
            <Button
              look="outline"
              size="xs"
              isActive={draft.refund}
              icon={<ArrowUUpLeftIcon weight="bold" />}
              onClick={() => {
                update({
                  refund: !draft.refund,
                  refundOfId: draft.refund ? null : draft.refundOfId,
                  ...(draft.refund
                    ? {}
                    : { paysDownAccountId: null, paysDownAmountText: "" }),
                });
              }}
            >
              {t({ en: "Refund", zh: "退款" })}
            </Button>
          </div>
          {draft.refund && refundCandidates.length > 0 ? (
            <Select
              label={t({ en: "Refund of", zh: "原支出" })}
              size="sm"
              value={draft.refundOfId ?? ""}
              onChange={(event) => {
                update({ refundOfId: event.target.value || null });
              }}
            >
              <option value="">{t({ en: "Not linked", zh: "不关联" })}</option>
              {refundCandidates.map((row) => (
                <option key={row.id} value={row.id}>
                  {[
                    displayDay(row.date, locale, "weekday"),
                    shownMoney(row),
                    row.note,
                  ]
                    .filter((part) => part !== "")
                    .join(" · ")}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  amount: {
    fontWeight: font.weight_6,
  },
});
