"use client";

import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Heading } from "@tuja/ui/components/heading";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { BarChart } from "../charts/bar-chart.tsx";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type {
  AnalyticsState,
  AnalyticsView,
  CategoryTrend as Trend,
} from "./compute-analytics-view.ts";
import { formatPeriod } from "./format-period.ts";
import { isMajorPeriod } from "./is-major-period.ts";
import { transactionsHref } from "./transactions-href.ts";
import type { AnalyticsIndex } from "./types.ts";
import { useAnalyticsNames } from "./use-analytics-names.ts";
import { usePeriodLabel } from "./use-period-label.ts";

interface CategoryTrendProps {
  trend: Trend;
  state: AnalyticsState;
  view: AnalyticsView;
  index: AnalyticsIndex;
  currency: string;
  onChange: (patch: Partial<AnalyticsState>) => void;
}

/**
 * The picked Category over the range, by period or one bar per
 * Transaction, with its highest, lowest and average bar and the IQR rule
 * to leave out outliers. A bar opens the Transactions behind it.
 */
export function CategoryTrend({
  trend,
  state,
  view,
  index,
  currency,
  onChange,
}: CategoryTrendProps) {
  const locale = useLocale();
  const router = useRouter();
  const names = useAnalyticsNames();
  const datePeriodLabel = usePeriodLabel(view);
  const headingId = useId();
  const switchId = useId();
  const { name, emoji } = names.category(trend.categoryId);
  const title = emoji ? `${emoji} ${name}` : name;
  const signed = state.kind === "net";
  const money = (minor: number) =>
    formatMoney(Math.round(minor), currency, locale, {
      signDisplay: signed ? "exceptZero" : "auto",
    });
  const tone =
    view.path.at(-1) === trend.categoryId
      ? "accent"
      : (view.rows.find((item) => item.categoryId === trend.categoryId)?.tone ??
        "accent");
  const byTransaction = trend.dimension === "transaction";
  const unit = byTransaction
    ? t({ en: "transactions", zh: "笔交易" })
    : {
        day: t({ en: "days", zh: "天" }),
        week: t({ en: "weeks", zh: "周" }),
        month: t({ en: "months", zh: "个月" }),
        year: t({ en: "years", zh: "年" }),
      }[view.grouping];
  const averageLabel = t({ en: "Average", zh: "平均" });
  const listHref = getLocalePath(
    transactionsHref({
      from: view.range.from,
      to: view.range.to,
      kind: state.kind,
      member: state.member,
      categoryIds: [trend.categoryId],
    }),
    locale,
  );
  const stats = trend.stats;
  const figures = stats
    ? [
        { label: t({ en: "Highest", zh: "最高" }), value: money(stats.max) },
        { label: t({ en: "Lowest", zh: "最低" }), value: money(stats.min) },
        {
          label: t({ en: "Spread", zh: "波幅" }),
          value: money(stats.max - stats.min),
        },
        { label: averageLabel, value: money(stats.average) },
      ]
    : [];

  const periodLabel = (at: number) =>
    byTransaction
      ? displayDay(index.days[trend.rows[at]], locale, "dayYear")
      : datePeriodLabel(at);
  const periodTick = (at: number) =>
    byTransaction
      ? displayDay(index.days[trend.rows[at]], locale, "day")
      : formatPeriod(view.boundaries, at, view.grouping, locale, "tick");

  const open = (at: number) => {
    if (byTransaction) {
      const id = index.transactionIds[trend.rows[at]];
      router.push(getLocalePath(`/finance/transactions?id=${id}`, locale));
      return;
    }
    router.push(
      getLocalePath(
        transactionsHref({
          from: fromEpochDay(view.boundaries[at]),
          to: fromEpochDay(view.boundaries[at + 1] - 1),
          kind: state.kind,
          member: state.member,
          categoryIds: [trend.categoryId],
        }),
        locale,
      ),
    );
  };

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <header css={[cluster.item, styles.header]}>
        <div css={stack.tight}>
          <Text look="caption" tone="muted">
            {t({ en: "Category trend", zh: "分类趋势" })}
          </Text>
          <Heading level={2} look="h4" id={headingId} css={styles.heading}>
            {title}
          </Heading>
        </div>
        <AnchorButton
          href={listHref}
          linkComponent={Link}
          size="sm"
          look="ghost"
          icon={<ListIcon weight="bold" />}
        >
          {t({ en: "Transactions", zh: "交易" })}
        </AnchorButton>
      </header>
      <SegmentedControl
        size="sm"
        fullWidth
        aria-label={t({ en: "One bar per", zh: "每根柱代表" })}
        options={[
          { value: "date", label: t({ en: "By date", zh: "按日期" }) },
          {
            value: "transaction",
            label: t({ en: "By transaction", zh: "按交易" }),
          },
        ]}
        value={trend.dimension}
        onChange={(dimension) => {
          onChange({ dimension });
        }}
      />
      {stats ? (
        <>
          <dl css={styles.figures}>
            {figures.map((figure) => (
              <div key={figure.label} css={styles.figure}>
                <dt css={[typeRole.caption, styles.muted]}>{figure.label}</dt>
                <dd css={[typeRole.body, typeModifier.numeric, styles.value]}>
                  {figure.value}
                </dd>
              </div>
            ))}
          </dl>
          {stats.partialLeftOut ? (
            <Text as="p" look="caption" tone="muted">
              {t({
                en: "Lowest, spread and average leave out the partial period, drawn lighter.",
                zh: "最低、波幅和平均不计入颜色较浅的不完整时段。",
              })}
            </Text>
          ) : null}
          <BarChart
            label={title}
            description={t({
              en: "One bar per period or transaction of this category, with a line at the average bar.",
              zh: "此分类每个时段或每笔交易一根柱，虚线为平均值。",
            })}
            periodCount={trend.values.length}
            periodLabel={periodLabel}
            periodTick={periodTick}
            partialPeriods={byTransaction ? undefined : view.partial}
            periodMajor={
              byTransaction
                ? undefined
                : (at) => isMajorPeriod(view.boundaries, at, view.grouping)
            }
            series={[
              {
                key: trend.categoryId,
                label: title,
                values: trend.values,
                tone,
              },
            ]}
            formatValue={money}
            formatTick={(minor, step) =>
              formatAxisMoney(minor, step, currency, locale)
            }
            referenceLine={{
              value: stats.average,
              label: `${averageLabel} ${money(stats.average)}`,
            }}
            restReadout={`${stats.count.toLocaleString(locale)} ${unit} ${t({
              en: "with a value",
              zh: "有记录",
            })}`}
            onActivate={(at) => {
              open(at);
            }}
            activateHint={t({
              en: "Press Enter to see the transactions.",
              zh: "按回车查看交易。",
            })}
          />
        </>
      ) : (
        <Text as="p" look="bodySmall" tone="muted">
          {t({ en: "Nothing in this range.", zh: "这段时间没有记录。" })}
        </Text>
      )}
      {trend.outlierCount > 0 || trend.excluded ? (
        <div css={row.tight}>
          <Switch
            id={switchId}
            size="sm"
            value={state.excludeOutliers ? "on" : "off"}
            onChange={(value) => {
              onChange({ excludeOutliers: value === "on" });
            }}
          />
          <label htmlFor={switchId} css={[typeRole.bodySmall, styles.muted]}>
            {t({ en: "Leave out outliers", zh: "过滤离群交易" })}
            {` (${trend.outlierCount.toLocaleString(locale)})`}
          </label>
        </div>
      ) : null}
    </section>
  );
}

const styles = stylex.create({
  header: {
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heading: {
    margin: 0,
  },
  figures: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: rhythm.tight,
    margin: 0,
  },
  figure: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  value: {
    margin: 0,
    fontWeight: font.weight_6,
  },
  muted: {
    color: color.fgMuted,
  },
});
