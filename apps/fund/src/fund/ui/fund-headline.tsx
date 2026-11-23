import { t } from "@tuja/i18n";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Stat, StatGroup } from "@tuja/ui/components/stat";
import type { FundState } from "../views/load-fund-state.ts";
import { displayDate } from "./display-date.ts";
import { formatMoney } from "./format-money.ts";
import { formatPercent } from "./format-percent.ts";
import { toneOf } from "./tone-of.ts";

/**
 * The fund at a glance: its value, its return against the benchmark, its
 * cash and, on the Desk, the models at the meeting.
 */
export function FundHeadline({
  state,
  locale,
  showModels = false,
}: {
  state: FundState;
  locale: SupportedLocale;
  showModels?: boolean;
}) {
  const { portfolio, startedOn, returnPct, benchmarkReturnPct } = state;
  const started = startedOn !== null;
  const benchmarkText =
    benchmarkReturnPct === null
      ? null
      : t({ en: "Benchmark {pct}", zh: "基准 {pct}" }).replace(
          "{pct}",
          formatPercent(benchmarkReturnPct, { signed: true }),
        );
  const ahead =
    returnPct !== null && benchmarkReturnPct !== null
      ? Math.round((returnPct - benchmarkReturnPct) * 10) / 10
      : null;
  const points = t({ en: "{n} pts", zh: "{n} 个百分点" }).replace(
    "{n}",
    Math.abs(ahead ?? 0).toFixed(1),
  );
  const aheadText =
    ahead === null || ahead === 0
      ? t({ en: "level with it", zh: "与基准持平" })
      : (ahead > 0
          ? t({ en: "{pts} ahead", zh: "领先 {pts}" })
          : t({ en: "{pts} behind", zh: "落后 {pts}" })
        ).replace("{pts}", points);

  return (
    <StatGroup>
      <Stat
        label={t({ en: "Fund value", zh: "基金净值" })}
        value={formatMoney(started ? portfolio.navGbp : state.depositsGbp)}
        detail={
          started
            ? t({ en: "Started {date}", zh: "{date} 起步" }).replace(
                "{date}",
                displayDate(startedOn, locale, "dayYear"),
              )
            : t({
                en: "Paper money, not yet put to work",
                zh: "模拟资金，尚未开始运作",
              })
        }
      />
      <Stat
        label={t({ en: "Return since start", zh: "起步以来收益" })}
        value={
          returnPct === null ? "—" : formatPercent(returnPct, { signed: true })
        }
        intent={returnPct === null ? "default" : toneOf(returnPct, 1)}
        detail={
          returnPct === null
            ? t({
                en: "Counts from the first deposit",
                zh: "从首笔入金开始计算",
              })
            : ahead === null
              ? benchmarkText
              : `${benchmarkText ?? ""}${t({ en: " · ", zh: " · " })}${aheadText}`
        }
      />
      <Stat
        label={t({ en: "Cash", zh: "现金" })}
        value={formatMoney(started ? portfolio.cashGbp : state.depositsGbp)}
        detail={t({ en: "{pct} of the fund", zh: "占基金 {pct}" }).replace(
          "{pct}",
          formatPercent(started ? portfolio.cashWeightPct : 100, { digits: 0 }),
        )}
      />
      {showModels ? (
        <Stat
          label={t({ en: "Models", zh: "模型" })}
          value={
            state.modelTier === "live"
              ? t({ en: "Live", zh: "正式" })
              : t({ en: "Development", zh: "开发" })
          }
          detail={
            state.modelTier === "live"
              ? t({
                  en: "Claude Fable 5.2 at every seat",
                  zh: "每个席位都用 Claude Fable 5.2",
                })
              : t({
                  en: "Claude Haiku 5.5, the cheapest, at every seat",
                  zh: "每个席位都用最便宜的 Claude Haiku 5.5",
                })
          }
        />
      ) : null}
    </StatGroup>
  );
}
