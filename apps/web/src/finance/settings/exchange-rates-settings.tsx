"use client";

import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { useRef, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { fxRateText } from "../accounts/build-fx-rate-mutations.ts";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { isValidDay } from "../domain/dates/to-epoch-day.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { EditSheet } from "./edit-sheet.tsx";
import {
  latestFxRates,
  parseFxRate,
  type LatestFxRate,
} from "./latest-fx-rates.ts";
import { SettingsList } from "./settings-list.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";

interface Draft {
  currency: string;
  rate: string;
  on: string;
}

function formatRate(rate: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumSignificantDigits: rate >= 1 ? 6 : 4,
  }).format(rate);
}

/**
 * The rate of each other currency the open accounts use, against the base
 * currency: "1 USD = 0.79 GBP" on its date, and a form to enter a newer
 * one. Balances in that currency count at the latest rate on or before
 * each day.
 */
export function ExchangeRatesSettings() {
  const locale = useLocale();
  const today = useHouseholdToday();
  const baseCurrency = useBaseCurrency();
  const accounts = useReplica(liveRowSelectors.accounts);
  const fxRows = useReplica((snapshot) => snapshot.tables.fxRates);
  const apply = useApplyMutations();
  const rateRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<{ rate?: string; on?: string }>({});

  const currencies = [
    ...new Set(
      accounts
        .filter(
          (account) =>
            account.closedOn === null && account.currency !== baseCurrency,
        )
        .map((account) => account.currency),
    ),
  ].sort();
  const rates = latestFxRates(fxRows.values(), currencies, baseCurrency);
  const accountCount = (currency: string) =>
    accounts.filter(
      (account) => account.closedOn === null && account.currency === currency,
    ).length;

  const labels = {
    noRate: t({
      en: "No rate yet, so it counts one to one",
      zh: "尚无汇率，暂按 1:1 计算",
    }),
    accounts: t({ en: "accounts", zh: "个账户" }),
    account: t({ en: "account", zh: "个账户" }),
    rateMissing: t({
      en: "Enter a rate above zero, such as 0.79",
      zh: "请输入大于零的汇率，例如 0.79",
    }),
    dayMissing: t({ en: "Pick a date", zh: "请选择日期" }),
    update: t({ en: "Update rate", zh: "更新汇率" }),
    saved: t({ en: "rate saved", zh: "汇率已保存" }),
  };

  function open(entry: LatestFxRate) {
    setErrors({});
    setDraft({
      currency: entry.currency,
      rate: entry.rate === null ? "" : fxRateText(entry.rate),
      on: today,
    });
  }

  function save() {
    if (!draft) return false;
    const rate = parseFxRate(draft.rate);
    const nextErrors = {
      ...(rate === null ? { rate: labels.rateMissing } : {}),
      ...(isValidDay(draft.on) ? {} : { on: labels.dayMissing }),
    };
    setErrors(nextErrors);
    if (rate === null || Object.keys(nextErrors).length > 0) return false;
    return apply(
      [
        {
          name: "setFxRate",
          args: {
            base: draft.currency,
            quote: baseCurrency,
            on: draft.on,
            rate,
          },
        },
      ],
      { message: `${draft.currency} ${labels.saved}` },
    );
  }

  const typed = draft ? parseFxRate(draft.rate) : null;

  return (
    <SettingsPanel
      title={t({ en: "Exchange rates", zh: "汇率" })}
      description={t({
        en: "Accounts in another currency count in the base currency at the latest rate on or before each day. Enter a new rate when it has moved.",
        zh: "外币账户按当天或之前最近一次的汇率折算为本位币。汇率变动时，在这里输入新汇率。",
      })}
    >
      {rates.length === 0 ? (
        <Text look="bodySmall" tone="muted">
          {`${t({
            en: "Every open account is in ",
            zh: "所有在用账户都以此币种计价：",
          })}${baseCurrency}${t({
            en: ". Another currency joins this list when an account uses it.",
            zh: "。账户使用其他币种时，会出现在此列表中。",
          })}`}
        </Text>
      ) : (
        <SettingsList>
          {rates.map((entry) => {
            const count = accountCount(entry.currency);
            return (
              <SettingsRow
                key={entry.currency}
                title={
                  entry.rate === null
                    ? entry.currency
                    : `1 ${entry.currency} = ${formatRate(entry.rate, locale)} ${baseCurrency}`
                }
                detail={[
                  entry.on === null
                    ? labels.noRate
                    : displayDay(entry.on, locale, "dayYear"),
                  `${new Intl.NumberFormat(locale).format(count)} ${count === 1 ? labels.account : labels.accounts}`,
                ].join(" · ")}
                actions={
                  <Button
                    size="sm"
                    look="outline"
                    aria-label={`${labels.update}: ${entry.currency}`}
                    onClick={() => {
                      open(entry);
                    }}
                  >
                    {labels.update}
                  </Button>
                }
                onClick={() => {
                  open(entry);
                }}
              />
            );
          })}
        </SettingsList>
      )}
      <EditSheet
        isOpen={draft !== null}
        onClose={() => {
          setDraft(null);
        }}
        title={
          draft ? `${draft.currency} ${t({ en: "rate", zh: "汇率" })}` : ""
        }
        initialFocusRef={rateRef}
        onSave={save}
      >
        {draft ? (
          <>
            <TextField
              ref={rateRef}
              label={`${t({ en: "Rate", zh: "汇率" })} · 1 ${draft.currency} = ? ${baseCurrency}`}
              inputMode="decimal"
              value={draft.rate}
              error={errors.rate}
              description={
                typed === null
                  ? undefined
                  : `1 ${draft.currency} = ${formatRate(typed, locale)} ${baseCurrency} · 1 ${baseCurrency} = ${formatRate(1 / typed, locale)} ${draft.currency}`
              }
              onChange={(event) => {
                setDraft({ ...draft, rate: event.target.value });
                setErrors({ ...errors, rate: undefined });
              }}
              onFocus={(event) => {
                event.currentTarget.select();
              }}
            />
            <TextField
              type="date"
              label={t({ en: "From", zh: "生效日期" })}
              description={t({
                en: "The rate counts from this day until a newer one.",
                zh: "此汇率从这天起生效，直到有更新的汇率。",
              })}
              value={draft.on}
              max={today}
              error={errors.on}
              onChange={(event) => {
                setDraft({ ...draft, on: event.target.value });
                setErrors({ ...errors, on: undefined });
              }}
            />
          </>
        ) : null}
      </EditSheet>
    </SettingsPanel>
  );
}
