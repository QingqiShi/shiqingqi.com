"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { BarChart, type BarSeries } from "../charts/bar-chart.tsx";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type {
  AnalyticsState,
  AnalyticsView,
  BreakdownRow,
} from "./compute-analytics-view.ts";
import { formatPercent } from "./format-percent.ts";
import { formatPeriod } from "./format-period.ts";
import { isMajorPeriod } from "./is-major-period.ts";
import { RankedRow } from "./ranked-row.tsx";
import { transactionsHref } from "./transactions-href.ts";
import { useAnalyticsNames } from "./use-analytics-names.ts";
import { usePeriodLabel } from "./use-period-label.ts";

interface CategoryBreakdownProps {
  state: AnalyticsState;
  view: AnalyticsView;
  currency: string;
  onChange: (patch: Partial<AnalyticsState>) => void;
}

/**
 * Spending (or income, or net) by Category: a stacked bar per period and a
 * ranked list with each Category's share and change on the period before.
 * Picking a parent opens its children; picking any Category shows its trend.
 * A bar segment opens the Transactions behind it.
 */
export function CategoryBreakdown({
  state,
  view,
  currency,
  onChange,
}: CategoryBreakdownProps) {
  const locale = useLocale();
  const router = useRouter();
  const names = useAnalyticsNames();
  const periodLabel = usePeriodLabel(view);
  const headingId = useId();
  const signed = state.kind === "net";
  const money = (minor: number) =>
    formatMoney(Math.round(minor), currency, locale, {
      signDisplay: signed ? "exceptZero" : "auto",
    });
  const otherLabel = t({ en: "Other", zh: "其他" });
  const noCategory = t({ en: "No category", zh: "无分类" });
  const ownLabel = t({ en: "not in a subcategory", zh: "未细分" });
  const allCategories = t({ en: "All categories", zh: "全部分类" });
  const versusBefore = t({ en: "vs before", zh: "环比" });
  const opened = view.path.at(-1) ?? null;

  const nameOf = (categoryId: string | null, direct: boolean) => {
    if (categoryId === null) return noCategory;
    const { name, emoji } = names.category(categoryId);
    const label = emoji ? `${emoji} ${name}` : name;
    return direct ? `${label} · ${ownLabel}` : label;
  };
  const rowName = (item: BreakdownRow) => nameOf(item.categoryId, item.direct);

  const series: BarSeries[] = view.series.map((item) => ({
    key: item.key,
    label:
      item.group === "other"
        ? otherLabel
        : item.group === "none"
          ? noCategory
          : nameOf(item.categoryIds[0] ?? null, item.key === "direct"),
    values: item.values,
    tone: item.tone,
  }));

  const largest = view.rows.reduce(
    (most, item) => Math.max(most, Math.abs(item.value)),
    0,
  );
  const selectedId = state.category;

  const select = (item: BreakdownRow) => {
    if (item.categoryId === null || item.direct) return;
    if (selectedId === item.categoryId && !item.hasChildren) {
      onChange({ category: opened });
    } else {
      onChange({ category: item.categoryId });
    }
  };

  const openPeriod = (index: number, key: string | null) => {
    const match = view.series.find((item) => item.key === key);
    const categoryIds = match?.categoryIds ?? (opened === null ? [] : [opened]);
    const from = fromEpochDay(view.boundaries[index]);
    const to = fromEpochDay(view.boundaries[index + 1] - 1);
    router.push(
      getLocalePath(
        transactionsHref({
          from,
          to,
          kind: state.kind,
          member: state.member,
          categoryIds,
        }),
        locale,
      ),
    );
  };

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <div css={stack.tight}>
        <Heading level={2} look="h4" id={headingId} css={styles.heading}>
          {t({ en: "By category", zh: "按分类" })}
        </Heading>
        {view.path.length > 0 ? (
          <nav
            aria-label={t({ en: "Category path", zh: "分类路径" })}
            css={[cluster.inline, typeRole.caption]}
          >
            <button
              type="button"
              css={[buttonReset.base, styles.crumb]}
              onClick={() => {
                onChange({ category: null });
              }}
            >
              {allCategories}
            </button>
            {view.path.map((id, at) => (
              <span key={id} css={row.inline}>
                <CaretRightIcon weight="bold" aria-hidden css={styles.caret} />
                {at === view.path.length - 1 ? (
                  <span aria-current="location" css={styles.current}>
                    {nameOf(id, false)}
                  </span>
                ) : (
                  <button
                    type="button"
                    css={[buttonReset.base, styles.crumb]}
                    onClick={() => {
                      onChange({ category: id });
                    }}
                  >
                    {nameOf(id, false)}
                  </button>
                )}
              </span>
            ))}
          </nav>
        ) : null}
      </div>
      {view.rows.length === 0 ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "Nothing in this range.",
            zh: "这段时间没有记录。",
          })}
        </Text>
      ) : (
        <>
          <BarChart
            label={t({ en: "By category", zh: "按分类" })}
            description={t({
              en: "Each bar is one period, split by category. Pick a segment to see its transactions.",
              zh: "每根柱代表一个时段，按分类分段。点按某一段可查看对应交易。",
            })}
            periodCount={view.boundaries.length - 1}
            periodLabel={periodLabel}
            partialPeriods={view.partial}
            periodTick={(index) =>
              formatPeriod(
                view.boundaries,
                index,
                view.grouping,
                locale,
                "tick",
              )
            }
            periodMajor={(index) =>
              isMajorPeriod(view.boundaries, index, view.grouping)
            }
            series={series}
            formatValue={money}
            formatTick={(minor, step) =>
              formatAxisMoney(minor, step, currency, locale)
            }
            activeSeriesKey={
              selectedId !== null && selectedId !== opened ? selectedId : null
            }
            onActivate={openPeriod}
            activateHint={t({
              en: "Press Enter to see the transactions.",
              zh: "按回车查看交易。",
            })}
          />
          <ul css={[stack.tight, styles.list]}>
            {view.rows.map((item) => {
              const change =
                item.previous === null || item.previous === 0
                  ? null
                  : (item.value - item.previous) / Math.abs(item.previous);
              const details = [
                signed || item.value === 0
                  ? null
                  : formatPercent(item.share, locale),
                change === null
                  ? null
                  : `${formatPercent(change, locale, true)} ${versusBefore}`,
              ].filter((part) => part !== null);
              return (
                <RankedRow
                  key={item.bucket}
                  label={
                    <span css={row.inline}>
                      <span css={styles.name}>{rowName(item)}</span>
                      {item.hasChildren ? (
                        <CaretRightIcon
                          weight="bold"
                          aria-hidden
                          css={styles.caret}
                        />
                      ) : null}
                    </span>
                  }
                  value={money(item.value)}
                  detail={details.join(" · ")}
                  magnitude={largest === 0 ? 0 : Math.abs(item.value) / largest}
                  tone={item.tone}
                  isSelected={selectedId === item.categoryId}
                  onSelect={
                    item.categoryId === null || item.direct
                      ? undefined
                      : () => {
                          select(item);
                        }
                  }
                />
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

const styles = stylex.create({
  heading: {
    margin: 0,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  crumb: {
    color: color.fgMuted,
    textDecoration: "underline",
    textUnderlineOffset: "0.2em",
  },
  current: {
    color: color.fg,
    fontWeight: font.weight_6,
  },
  caret: {
    color: color.fgMuted,
    flexShrink: 0,
  },
  name: {
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
