"use client";

import { t } from "@tuja/i18n";
import { Select } from "@tuja/ui/components/select";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { currencySymbol } from "../accounts/currency-symbol.ts";
import { accountSelectChildren } from "./account-select-children.tsx";
import { FieldLabel } from "./field-label.tsx";
import type { TransactionForm } from "./use-transaction-form.ts";

export function TransferFields({ form }: { form: TransactionForm }) {
  const {
    data,
    draft,
    locale,
    touched,
    accountRef,
    toAccountRef,
    toAccount,
    needsToAmount,
    errorOf,
    update,
    convertedToAmount,
    labelMark,
  } = form;
  const fromSelectChildren = accountSelectChildren(
    data,
    draft,
    (candidate) => !candidate.isSystem || candidate.id === draft.accountId,
  );
  const toAccountSelectChildren = accountSelectChildren(
    data,
    draft,
    (candidate) =>
      candidate.id === draft.toAccountId ||
      (!candidate.isSystem && candidate.id !== draft.accountId),
  );

  return (
    <div css={stack.item}>
      <div css={stack.tight}>
        <FieldLabel mark={labelMark("account")}>
          {t({ en: "From", zh: "转出账户" })}
        </FieldLabel>
        <Select
          ref={accountRef}
          label={t({ en: "From", zh: "转出账户" })}
          labelHidden
          value={draft.accountId ?? ""}
          placeholder={t({ en: "Choose an account", zh: "选择账户" })}
          error={errorOf("account")}
          onChange={(event) => {
            update({ accountId: event.target.value || null }, ["account"]);
          }}
        >
          {fromSelectChildren}
        </Select>
      </div>
      <div css={stack.tight}>
        <FieldLabel mark={labelMark("toAccount")}>
          {t({ en: "To", zh: "转入账户" })}
        </FieldLabel>
        <Select
          ref={toAccountRef}
          label={t({ en: "To", zh: "转入账户" })}
          labelHidden
          value={draft.toAccountId ?? ""}
          placeholder={t({ en: "Choose an account", zh: "选择账户" })}
          error={errorOf("toAccount")}
          onChange={(event) => {
            const toAccountId = event.target.value || null;
            update(
              touched.has("toAmount")
                ? { toAccountId }
                : {
                    toAccountId,
                    toAmountText: convertedToAmount(
                      draft.amountText,
                      toAccountId,
                    ),
                  },
              ["toAccount"],
            );
          }}
        >
          {toAccountSelectChildren}
        </Select>
      </div>
      {needsToAmount && toAccount ? (
        <TextField
          label={t({ en: "Amount received", zh: "转入金额" })}
          description={t({
            en: "Filled in from the latest exchange rate.",
            zh: "按最新汇率填入。",
          })}
          inputMode="decimal"
          autoComplete="off"
          leading={currencySymbol(toAccount.currency, locale)}
          value={draft.toAmountText}
          error={errorOf("toAmount")}
          controlCss={typeModifier.numeric}
          onChange={(event) => {
            update({ toAmountText: event.target.value }, ["toAmount"]);
          }}
        />
      ) : null}
    </div>
  );
}
