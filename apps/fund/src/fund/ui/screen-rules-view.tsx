"use client";

import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/ListMagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { CardDescription } from "@tuja/ui/components/card-description";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Table } from "@tuja/ui/components/table";
import { TableBody } from "@tuja/ui/components/table-body";
import { TableCell } from "@tuja/ui/components/table-cell";
import { TableHead } from "@tuja/ui/components/table-head";
import { TableHeaderCell } from "@tuja/ui/components/table-header-cell";
import { TableRow } from "@tuja/ui/components/table-row";
import { Text } from "@tuja/ui/components/text";
import { show } from "@tuja/ui/primitives/show.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ScreenWeights } from "../contracts/fund-thesis-schema.ts";
import {
  SCREEN_RULES,
  type ScoreInput,
  type ScoreName,
} from "../screener/screen-rules.ts";
import type { ScreenRowView, ScreenView } from "../views/load-thesis.ts";
import { displayDate } from "./display-date.ts";
import { formatCompactMoney } from "./format-compact-money.ts";

const SCORES: readonly ScoreName[] = [
  "value",
  "quality",
  "momentum",
  "growth",
  "lowVolatility",
];

const styles = stylex.create({
  rules: {
    margin: 0,
    paddingInlineStart: space._4,
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
  },
});

function useScoreNames(): Record<ScoreName, string> {
  return {
    value: t({ en: "Value", zh: "价值" }),
    quality: t({ en: "Quality", zh: "质量" }),
    momentum: t({ en: "Momentum", zh: "动量" }),
    growth: t({ en: "Growth", zh: "成长" }),
    lowVolatility: t({ en: "Low volatility", zh: "低波动" }),
  };
}

function useInputNames(): Record<ScoreInput, string> {
  return {
    earningsYield: t({ en: "earnings yield", zh: "盈利收益率" }),
    forwardEarningsYield: t({
      en: "forward earnings yield",
      zh: "预期盈利收益率",
    }),
    freeCashFlowYield: t({
      en: "free cash flow yield",
      zh: "自由现金流收益率",
    }),
    returnOnEquity: t({ en: "return on equity", zh: "净资产收益率" }),
    profitMargin: t({ en: "profit margin", zh: "利润率" }),
    debtToEquity: t({ en: "debt to equity", zh: "负债权益比" }),
    return12m1m: t({
      en: "12-month return without the last month",
      zh: "剔除最近一个月的 12 个月回报",
    }),
    vs200dma: t({
      en: "distance from the 200-day average",
      zh: "相对 200 日均线的距离",
    }),
    revenueGrowth: t({ en: "revenue growth", zh: "营收增长" }),
    earningsGrowth: t({ en: "earnings growth", zh: "盈利增长" }),
    volatility1y: t({ en: "1-year volatility", zh: "一年波动率" }),
  };
}

function ScoreRule({
  score,
  weightPct,
}: {
  score: ScoreName;
  weightPct: number | null;
}) {
  const names = useScoreNames();
  const inputs = useInputNames();
  const higher = t({ en: "higher is better", zh: "越高越好" });
  const lower = t({ en: "lower is better", zh: "越低越好" });
  const aside = t({ en: " ({x})", zh: "（{x}）" });
  const parts = SCREEN_RULES.scores[score].map(
    (input) =>
      `${inputs[input.input]}${aside.replace("{x}", input.better === "higher" ? higher : lower)}`,
  );
  return (
    <Text as="li" look="bodySmall">
      <strong>{names[score]}</strong>
      {weightPct === null
        ? null
        : t({ en: ", {pct} of the score: ", zh: "，占总分 {pct}：" }).replace(
            "{pct}",
            `${String(Math.round(weightPct))}%`,
          )}
      {weightPct === null ? t({ en: ": ", zh: "：" }) : null}
      {parts.join(t({ en: ", ", zh: "，" }))}
    </Text>
  );
}

function ShortlistRow({ row }: { row: ScreenRowView }) {
  const names = useScoreNames();
  return (
    <ListRow
      wrap
      detail={`${row.name} · ${row.sector}`}
      value={Math.round(row.composite)}
      extra={
        <Text as="span" look="caption" tone="muted" numeric>
          {SCORES.map(
            (score) =>
              `${names[score]} ${String(Math.round(row.percentiles[score]))}`,
          ).join(" · ")}
        </Text>
      }
    >
      {row.symbol}
    </ListRow>
  );
}

function ShortlistTable({ rows }: { rows: readonly ScreenRowView[] }) {
  const names = useScoreNames();
  return (
    <Table caption={t({ en: "Shortlist", zh: "候选名单" })}>
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">
            {t({ en: "Stock", zh: "股票" })}
          </TableHeaderCell>
          {SCORES.map((score) => (
            <TableHeaderCell key={score} scope="col" numeric>
              {names[score]}
            </TableHeaderCell>
          ))}
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Score", zh: "总分" })}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.symbol}>
            <TableHeaderCell scope="row">
              <span css={stack.text}>
                <Text as="span" look="bodySmall" weight="semibold">
                  {row.symbol}
                </Text>
                <Text as="span" look="caption" tone="muted">
                  {`${row.name} · ${row.sector}`}
                </Text>
              </span>
            </TableHeaderCell>
            {SCORES.map((score) => (
              <TableCell key={score} numeric>
                {Math.round(row.percentiles[score])}
              </TableCell>
            ))}
            <TableCell numeric>
              <Text as="span" look="bodySmall" weight="semibold" numeric>
                {Math.round(row.composite)}
              </Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The rules of the stock screen in plain words, the weights the thesis
 * gives each score, and the newest shortlist with its five scores.
 */
export function ScreenRulesView({
  weights,
  screen,
}: {
  weights: ScreenWeights | null;
  screen: ScreenView | null;
}) {
  const locale = useLocale();
  const { eligibility, shortlist } = SCREEN_RULES;
  const total =
    weights === null
      ? 0
      : SCORES.reduce((sum, score) => sum + weights[score], 0);
  const weightOf = (score: ScoreName) =>
    weights === null
      ? null
      : total > 0
        ? (weights[score] / total) * 100
        : 100 / SCORES.length;
  return (
    <div css={stack.group}>
      <Card>
        <div css={stack.item}>
          <CardHeader>
            <CardTitle level={3}>
              {t({ en: "Which stocks qualify", zh: "哪些股票有资格" })}
            </CardTitle>
          </CardHeader>
          <ul css={styles.rules}>
            <Text as="li" look="bodySmall">
              {t({
                en: "At least {n} sessions of prices.",
                zh: "至少有 {n} 个交易日的价格。",
              }).replace("{n}", String(eligibility.minHistorySessions))}
            </Text>
            <Text as="li" look="bodySmall">
              {t({
                en: "A median of {value} traded a day over the last {n} sessions.",
                zh: "最近 {n} 个交易日的日成交额中位数至少 {value}。",
              })
                .replace(
                  "{value}",
                  formatCompactMoney(
                    eligibility.minMedianTradedValueGbp,
                    locale,
                  ),
                )
                .replace("{n}", String(eligibility.liquiditySessions))}
            </Text>
            <Text as="li" look="bodySmall">
              {t({
                en: "A market value of at least {value}.",
                zh: "市值至少 {value}。",
              }).replace(
                "{value}",
                formatCompactMoney(eligibility.minMarketCapGbp, locale),
              )}
            </Text>
          </ul>
        </div>
      </Card>
      <Card>
        <div css={stack.item}>
          <CardHeader>
            <CardTitle level={3}>
              {t({ en: "How they are scored", zh: "如何打分" })}
            </CardTitle>
            <CardDescription>
              {weights === null
                ? t({
                    en: "Five scores, each the average percentile of its inputs against the rest of the universe. The strategy session sets how much each counts.",
                    zh: "五项得分，每项是其指标在股票池中的平均百分位。各项权重由策略会议设定。",
                  })
                : t({
                    en: "Five scores, each the average percentile of its inputs against the rest of the universe, weighed as the thesis says.",
                    zh: "五项得分，每项是其指标在股票池中的平均百分位，按投资逻辑设定的权重加总。",
                  })}
            </CardDescription>
          </CardHeader>
          <ul css={styles.rules}>
            {SCORES.map((score) => (
              <ScoreRule
                key={score}
                score={score}
                weightPct={weightOf(score)}
              />
            ))}
          </ul>
          <Text as="p" look="caption" tone="muted">
            {t({
              en: "A stock with none of a score's inputs gets {neutral}. The shortlist is the best {size} the fund does not hold, at most {perSector} from one sector.",
              zh: "缺少某项全部指标的股票，该项记 {neutral} 分。候选名单是基金尚未持有的最好的 {size} 只，每个行业最多 {perSector} 只。",
            })
              .replace("{neutral}", String(SCREEN_RULES.neutralScore))
              .replace("{size}", String(shortlist.defaultSize))
              .replace("{perSector}", String(shortlist.maxPerSector))}
          </Text>
        </div>
      </Card>
      <Card>
        <div css={stack.item}>
          <CardHeader>
            <CardTitle level={3}>
              {t({ en: "Newest shortlist", zh: "最新候选名单" })}
            </CardTitle>
            {screen === null ? null : (
              <CardDescription>
                {t({
                  en: "From the screen of {date}: {n} stocks qualified. Scores are percentiles, 0 to 100.",
                  zh: "来自 {date} 的筛选：{n} 只股票合格。得分为百分位，0 到 100。",
                })
                  .replace(
                    "{date}",
                    displayDate(screen.asOf, locale, "weekday"),
                  )
                  .replace("{n}", String(screen.screened))}
              </CardDescription>
            )}
          </CardHeader>
          {screen === null ? (
            <EmptyState
              level={4}
              icon={<ListMagnifyingGlassIcon weight="bold" />}
              title={t({ en: "Not screened yet", zh: "还没有筛选" })}
              description={t({
                en: "Each meeting screens the universe first. Its shortlist shows after the first meeting.",
                zh: "每次会议都先筛选股票池。第一次会议之后会显示候选名单。",
              })}
            />
          ) : (
            <>
              <div css={show.wide}>
                <ShortlistTable rows={screen.shortlist} />
              </div>
              <div css={show.narrow}>
                <List form="plain">
                  {screen.shortlist.map((row) => (
                    <ShortlistRow key={row.symbol} row={row} />
                  ))}
                </List>
              </div>
              <div>
                <Button
                  href={getLocalePath(`/journal/${screen.runId}`, locale)}
                  look="outline"
                  size="sm"
                >
                  {t({ en: "Minutes of that meeting", zh: "那次会议的纪要" })}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
