"use client";

import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { ChartPieSliceIcon } from "@phosphor-icons/react/dist/ssr/ChartPieSlice";
import { LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr/LockSimpleOpen";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Columns } from "@tuja/ui/components/columns";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Section } from "@tuja/ui/components/section";
import { GUARDRAILS } from "../guardrails.ts";
import type { Exposure } from "../risk/measure-exposure.ts";
import { displayDate } from "./display-date.ts";
import { formatMoney } from "./format-money.ts";
import { WeightBars } from "./weight-bars.tsx";

/**
 * Where the fund's money sits: by sector and by currency, when its locked
 * shares unlock, and which holdings report earnings while they cannot be
 * sold.
 */
export function ExposureBreakdowns({
  exposure,
  names,
}: {
  exposure: Exposure | null;
  names: Record<string, string>;
}) {
  const locale = useLocale();
  const currencyNames = {
    GBP: t({ en: "Pounds, cash included", zh: "英镑（含现金）" }),
    USD: t({ en: "US dollars", zh: "美元" }),
  };
  const noStock = (
    <EmptyState
      level={4}
      icon={<ChartPieSliceIcon weight="bold" />}
      title={t({ en: "No stock held", zh: "没有持股" })}
      description={t({
        en: "The fund is all cash, so there is nothing to break down yet.",
        zh: "基金全部是现金，暂时没有可拆分的内容。",
      })}
    />
  );
  return (
    <>
      <Columns>
        <Section
          level={3}
          title={t({ en: "By sector", zh: "按行业" })}
          description={t({
            en: "Share of the fund in each sector.",
            zh: "各行业占基金的比例。",
          })}
        >
          {exposure === null || exposure.bySector.length === 0 ? (
            noStock
          ) : (
            <WeightBars
              items={exposure.bySector.map((sector) => ({
                key: sector.sector,
                label: sector.sector,
                weightPct: sector.weightPct,
              }))}
            />
          )}
        </Section>
        <Section
          level={3}
          title={t({ en: "By currency", zh: "按币种" })}
          description={t({
            en: "A US stock moves with the dollar as well as its price.",
            zh: "美股的价值既随股价变动，也随美元汇率变动。",
          })}
        >
          {exposure === null ? (
            noStock
          ) : (
            <WeightBars
              items={exposure.byCurrency.map((currency) => ({
                key: currency.currency,
                label: currencyNames[currency.currency],
                weightPct: currency.weightPct,
              }))}
            />
          )}
        </Section>
      </Columns>
      <Columns>
        <Section
          level={3}
          title={t({ en: "When locked shares unlock", zh: "锁定股份何时解锁" })}
          description={t({
            en: "Each lot can be sold {n} days after it was bought.",
            zh: "每批股票买入 {n} 天后才能卖出。",
          }).replace("{n}", String(GUARDRAILS.minHoldDays))}
        >
          {exposure === null || exposure.unlockSchedule.length === 0 ? (
            <EmptyState
              level={4}
              icon={<LockSimpleOpenIcon weight="bold" />}
              title={t({ en: "Nothing locked", zh: "没有锁定的股份" })}
              description={t({
                en: "Every share the fund holds can be sold today.",
                zh: "基金持有的每一股今天都可以卖出。",
              })}
            />
          ) : (
            <List>
              {exposure.unlockSchedule.map((entry) => (
                <ListRow
                  key={entry.date}
                  wrap
                  detail={entry.symbols.join(", ")}
                  value={formatMoney(entry.valueGbp, { whole: true })}
                >
                  {displayDate(entry.date, locale, "weekday")}
                </ListRow>
              ))}
            </List>
          )}
        </Section>
        <Section
          level={3}
          title={t({
            en: "Earnings while locked",
            zh: "锁定期内的财报",
          })}
          description={t({
            en: "A report can move a price the fund cannot yet sell.",
            zh: "财报可能让股价大动，而基金还不能卖出。",
          })}
        >
          {exposure === null || exposure.earningsInLock.length === 0 ? (
            <EmptyState
              level={4}
              icon={<CalendarDotsIcon weight="bold" />}
              title={t({ en: "None ahead", zh: "近期没有" })}
              description={t({
                en: "No holding reports earnings before its shares unlock.",
                zh: "没有持仓在解锁前发布财报。",
              })}
            />
          ) : (
            <List>
              {exposure.earningsInLock.map((entry) => (
                <EarningsRow
                  key={entry.symbol}
                  symbol={entry.symbol}
                  name={names[entry.symbol] ?? ""}
                  reportsOn={entry.nextEarningsDate}
                  unlocksOn={entry.unlockOn}
                />
              ))}
            </List>
          )}
        </Section>
      </Columns>
    </>
  );
}

function EarningsRow({
  symbol,
  name,
  reportsOn,
  unlocksOn,
}: {
  symbol: string;
  name: string;
  reportsOn: string;
  unlocksOn: string;
}) {
  const locale = useLocale();
  return (
    <ListRow
      wrap
      detail={t({
        en: "Reports {report} · unlocks {unlock}",
        zh: "{report} 发布财报 · {unlock} 解锁",
      })
        .replace("{report}", displayDate(reportsOn, locale, "weekday"))
        .replace("{unlock}", displayDate(unlocksOn, locale, "weekday"))}
    >
      {`${symbol} · ${name}`}
    </ListRow>
  );
}
