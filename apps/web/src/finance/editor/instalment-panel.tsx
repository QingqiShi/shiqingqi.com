"use client";

import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { currencySymbol } from "../accounts/currency-symbol.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import {
  buildInstalmentPlan,
  INSTALMENT_MONTHS,
} from "./build-instalment-plan.ts";
import type { EditorData } from "./use-editor-data.ts";

interface InstalmentPanelProps {
  data: EditorData;
  transaction: TransactionRow;
  entries: readonly EntryRow[];
  tagIds: readonly string[];
  /** Applies the plan; returns false when the Replica refused it. */
  onCreate: (
    mutations: readonly LocalMutationInput[],
    undo: readonly LocalMutationInput[],
    summary: string,
  ) => boolean;
  onCancel: () => void;
}

/**
 * "Pay in instalments" for a purchase: how many months and an optional fee,
 * a line that says what the plan will post, and the button that makes it.
 */
export function InstalmentPanel({
  data,
  transaction,
  entries,
  tagIds,
  onCreate,
  onCancel,
}: InstalmentPanelProps) {
  const locale = useLocale();
  const [monthsText, setMonthsText] = useState("12");
  const [feeText, setFeeText] = useState("");
  const [failed, setFailed] = useState(false);

  const accountId = entries.at(0)?.accountId ?? null;
  const currency =
    (accountId === null
      ? undefined
      : data.lookups.accountById.get(accountId)?.currency) ?? data.baseCurrency;
  const months = Number(monthsText.trim());
  const feeMinor =
    feeText.trim() === "" ? 0 : (parseMoney(feeText, currency) ?? -1);
  const payee =
    transaction.payeeId === null
      ? undefined
      : data.lookups.payeeById.get(transaction.payeeId);
  const category =
    transaction.categoryId === null
      ? undefined
      : data.lookups.categoryById.get(transaction.categoryId);
  const itemName =
    transaction.note.trim() || payee?.name || category?.name || "";
  const instalmentsWord = t({ en: "Instalments", zh: "分期" });

  const plan = buildInstalmentPlan({
    transaction,
    entries,
    tagIds,
    months,
    feeMinor,
    accountById: data.lookups.accountById,
    accounts: data.accounts,
    groups: data.accountGroups,
    names: {
      account: [instalmentsWord, itemName]
        .filter((part) => part !== "")
        .join(" · ")
        .slice(0, 200),
      rule: (itemName || instalmentsWord).slice(0, 200),
      group: t({ en: "Loans", zh: "贷款" }),
    },
    baseCurrency: data.baseCurrency,
    fx: data.fx,
    createId: () => crypto.randomUUID(),
  });

  const monthsError =
    monthsText.trim() !== "" &&
    (!Number.isInteger(months) ||
      months < INSTALMENT_MONTHS.min ||
      months > INSTALMENT_MONTHS.max)
      ? t({
          en: "Enter between 2 and 60 months.",
          zh: "请输入 2 到 60 之间的月数。",
        })
      : undefined;
  const feeError =
    feeMinor < 0
      ? t({
          en: "Enter a fee such as 12.50.",
          zh: "请输入手续费，例如 12.50。",
        })
      : undefined;

  const money = (minor: number) => formatMoney(minor, currency, locale);
  const paymentsLabel = t({ en: "monthly payments of", zh: "期，每期" });
  const firstOpen = t({ en: " (this one ", zh: "（本笔 " });
  const firstClose = t({ en: ")", zh: "）" });
  const lastLabel = t({ en: "last on", zh: "最后一期" });
  const totalLabel = t({ en: "total", zh: "合计" });
  const summary = plan
    ? [
        `${String(months)} ${paymentsLabel} ${money(plan.paymentMinor)}${
          plan.firstPaymentMinor === plan.paymentMinor
            ? ""
            : `${firstOpen}${money(plan.firstPaymentMinor)}${firstClose}`
        }`,
        `${totalLabel} ${money(plan.totalMinor)}`,
        `${lastLabel} ${displayDay(plan.lastPaymentOn, locale, "dayYear")}`,
      ].join(" · ")
    : null;
  const toastMessage = t({
    en: "Instalment plan added",
    zh: "已添加分期",
  });

  return (
    <Callout
      intent="info"
      icon={<CalendarDotsIcon weight="bold" />}
      title={t({ en: "Pay in instalments", zh: "分期付款" })}
    >
      <div css={stack.item}>
        <span>
          {t({
            en: "This purchase becomes the first monthly payment. A loan account, left out of net worth, tracks what is still owed, and a rule posts the other payments.",
            zh: "这笔消费记为第一期还款。系统会新建一个不计入净资产的贷款账户来记录剩余欠款，并由周期规则记下之后每期的还款。",
          })}
        </span>
        <div css={cluster.tight}>
          <TextField
            label={t({ en: "Months", zh: "期数（月）" })}
            size="sm"
            inputMode="numeric"
            autoComplete="off"
            value={monthsText}
            error={monthsError}
            css={typeModifier.numeric}
            onChange={(event) => {
              setMonthsText(event.target.value);
              setFailed(false);
            }}
          />
          <TextField
            label={t({ en: "Fee (optional)", zh: "手续费（选填）" })}
            size="sm"
            inputMode="decimal"
            autoComplete="off"
            leading={currencySymbol(currency, locale)}
            value={feeText}
            error={feeError}
            css={typeModifier.numeric}
            onChange={(event) => {
              setFeeText(event.target.value);
              setFailed(false);
            }}
          />
        </div>
        {summary ? (
          <span role="status" css={typeModifier.numeric}>
            {summary}
          </span>
        ) : null}
        {failed ? (
          <span role="alert">
            {t({
              en: "This plan could not be added. Try again.",
              zh: "未能添加分期，请重试。",
            })}
          </span>
        ) : null}
        <div css={cluster.tight}>
          <Button
            size="sm"
            look="primary"
            disabled={plan === null}
            onClick={() => {
              if (!plan || !summary) return;
              if (
                !onCreate(
                  plan.mutations,
                  plan.undo,
                  `${toastMessage} · ${summary}`,
                )
              ) {
                setFailed(true);
              }
            }}
          >
            {t({ en: "Add plan", zh: "添加分期" })}
          </Button>
          <Button size="sm" look="ghost" onClick={onCancel}>
            {t({ en: "Cancel", zh: "取消" })}
          </Button>
        </div>
      </div>
    </Callout>
  );
}
