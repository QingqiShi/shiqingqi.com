"use client";

import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { latestFxRates } from "./latest-fx-rates.ts";
import { SettingsPanel } from "./settings-panel.tsx";

function formatRate(rate: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumSignificantDigits: rate >= 1 ? 6 : 4,
  }).format(rate);
}

/**
 * The rate of each other currency the open accounts use, against the base
 * currency: "1 USD = 0.79 GBP", where it came from, and its date. Nobody
 * edits the rates: they are market rates, and balances in that currency
 * count at the latest rate on or before each day.
 */
export function ExchangeRatesSettings() {
  const locale = useLocale();
  const today = useHouseholdToday();
  const baseCurrency = useBaseCurrency();
  const accounts = useReplica(liveRowSelectors.accounts);
  const exchangeRates = useReplica((snapshot) => snapshot.exchangeRates);

  const openAccounts = accounts.filter((account) => account.closedOn === null);
  const currencies = [
    ...new Set(
      openAccounts
        .map((account) => account.currency)
        .filter((currency) => currency !== baseCurrency),
    ),
  ].sort();
  const rates = latestFxRates(exchangeRates.values(), currencies, baseCurrency);
  const accountCount = (currency: string) =>
    openAccounts.filter((account) => account.currency === currency).length;

  const labels = {
    noRate: t({
      en: "Counts one to one until a rate arrives, within a day",
      zh: "暂按 1:1 计算，一天内会有汇率",
    }),
    ecb: t({ en: "ECB", zh: "欧洲央行" }),
    household: t({ en: "From your records", zh: "来自你的记录" }),
    accounts: t({ en: "accounts", zh: "个账户" }),
    account: t({ en: "account", zh: "个账户" }),
  };

  return (
    <SettingsPanel
      title={t({ en: "Exchange rates", zh: "汇率" })}
      description={t({
        en: "Market rates from the European Central Bank, updated each working day. Accounts in another currency count in the base currency at the latest rate on or before each day.",
        zh: "汇率为欧洲央行公布的市场汇率，每个工作日更新。外币账户按当天或之前最近一次的汇率折算为本位币。",
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
        <ul css={[cardSurface.base, listSurface.list]}>
          {rates.map((entry) => {
            const count = accountCount(entry.currency);
            const rateFacts =
              entry.rate === null
                ? [labels.noRate]
                : [
                    entry.source === "ecb" ? labels.ecb : labels.household,
                    displayDay(
                      entry.on,
                      locale,
                      entry.on.slice(0, 4) === today.slice(0, 4)
                        ? "day"
                        : "dayYear",
                    ),
                  ];
            return (
              <li key={entry.currency} css={listSurface.item}>
                <div css={listSurface.row}>
                  <div css={[stack.text, styles.text]}>
                    <span
                      css={[typeRole.body, typeModifier.numeric, styles.title]}
                    >
                      {entry.rate === null
                        ? entry.currency
                        : `1 ${entry.currency} = ${formatRate(entry.rate, locale)} ${baseCurrency}`}
                    </span>
                    <span css={[typeRole.caption, styles.detail]}>
                      {[
                        ...rateFacts,
                        `${new Intl.NumberFormat(locale).format(count)} ${count === 1 ? labels.account : labels.accounts}`,
                      ].join(" · ")}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsPanel>
  );
}

const styles = stylex.create({
  text: {
    minInlineSize: 0,
  },
  title: {
    fontWeight: font.weight_5,
  },
  detail: {
    color: color.fgMuted,
  },
});
