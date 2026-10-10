"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Chip } from "@tuja/ui/components/chip";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { selected, selectedTokens } from "@tuja/ui/primitives/selected.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DayInput } from "../transactions/day-input.tsx";
import type {
  AnalyticsState,
  AnalyticsView,
} from "./compute-analytics-view.ts";
import type { AnalyticsRange } from "./resolve-analytics-range.ts";
import type { AnalyticsKind, Grouping } from "./types.ts";

interface AnalyticsControlsProps {
  state: AnalyticsState;
  view: AnalyticsView;
  members: readonly { id: string; name: string }[];
  onChange: (patch: Partial<AnalyticsState>) => void;
}

/** The range, what to add up, whose money, and the bar length, in one block above the charts. */
export function AnalyticsControls({
  state,
  view,
  members,
  onChange,
}: AnalyticsControlsProps) {
  const ranges: { value: AnalyticsRange; label: string }[] = [
    { value: "thisMonth", label: t({ en: "This month", zh: "本月" }) },
    { value: "lastMonth", label: t({ en: "Last month", zh: "上月" }) },
    { value: "3M", label: t({ en: "3M", zh: "近 3 个月" }) },
    { value: "12M", label: t({ en: "12M", zh: "近 12 个月" }) },
    { value: "YTD", label: t({ en: "YTD", zh: "今年" }) },
    { value: "all", label: t({ en: "All", zh: "全部" }) },
    { value: "custom", label: t({ en: "Custom", zh: "自定义" }) },
  ];
  const kinds: { value: AnalyticsKind; label: string }[] = [
    { value: "spending", label: t({ en: "Spending", zh: "支出" }) },
    { value: "income", label: t({ en: "Income", zh: "收入" }) },
    { value: "net", label: t({ en: "Net", zh: "净额" }) },
  ];
  const groupings: { value: Grouping; label: string }[] = [
    { value: "day", label: t({ en: "Day", zh: "日" }) },
    { value: "week", label: t({ en: "Week", zh: "周" }) },
    { value: "month", label: t({ en: "Month", zh: "月" }) },
    { value: "year", label: t({ en: "Year", zh: "年" }) },
  ];
  const everyone = t({ en: "Everyone", zh: "全家" });

  return (
    <div css={[stack.item, styles.block]}>
      <div
        role="group"
        aria-label={t({ en: "Date range", zh: "时间范围" })}
        css={cluster.tight}
      >
        {ranges.map((range) => (
          <Chip
            key={range.value}
            size="sm"
            aria-pressed={state.range === range.value}
            css={[selected.quiet, styles.rangeChip]}
            onClick={() => {
              onChange(
                range.value === "custom"
                  ? {
                      range: "custom",
                      from: state.from ?? view.range.from,
                      to: state.to ?? view.range.to,
                      grouping: null,
                    }
                  : { range: range.value, grouping: null },
              );
            }}
          >
            {range.label}
          </Chip>
        ))}
        {state.range === "custom" ? (
          <>
            <DayInput
              css={styles.day}
              label={t({ en: "From", zh: "开始" })}
              value={view.range.from}
              onChange={(from) => {
                onChange({ from, grouping: null });
              }}
            />
            <DayInput
              css={styles.day}
              label={t({ en: "To", zh: "结束" })}
              value={view.range.to}
              onChange={(to) => {
                onChange({ to, grouping: null });
              }}
            />
          </>
        ) : null}
      </div>
      <div css={styles.segments}>
        <SegmentedControl
          size="sm"
          fullWidth
          aria-label={t({ en: "What to add up", zh: "统计内容" })}
          options={kinds}
          value={state.kind}
          onChange={(kind) => {
            onChange({ kind, category: null });
          }}
        />
        {members.length > 1 ? (
          <SegmentedControl
            size="sm"
            fullWidth
            aria-label={t({ en: "Member", zh: "成员" })}
            options={[
              { value: "", label: everyone },
              ...members.map((member) => ({
                value: member.id,
                label: member.name,
              })),
            ]}
            value={state.member ?? ""}
            onChange={(member) => {
              onChange({ member: member === "" ? null : member });
            }}
          />
        ) : null}
        <SegmentedControl
          size="sm"
          fullWidth
          aria-label={t({ en: "Bar length", zh: "时间粒度" })}
          options={groupings}
          value={view.grouping}
          onChange={(grouping) => {
            onChange({ grouping });
          }}
        />
      </div>
    </div>
  );
}

const styles = stylex.create({
  block: {
    minInlineSize: 0,
  },
  rangeChip: {
    [selectedTokens.rest]: color.bgSurface,
  },
  segments: {
    display: "grid",
    gap: rhythm.tight,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(auto-fit, minmax(14rem, 1fr))",
    },
  },
  day: {
    appearance: "auto",
    maxInlineSize: "11rem",
    paddingInlineEnd: space._1,
  },
});
