"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import {
  buildDays,
  type buildView,
  forecastText,
  githubText,
  mergedText,
  rangeText,
  resetText,
  tilesInputFor,
  trendDays,
  trendText,
  updatedText,
  usedText,
} from "#src/pet/build-view.ts";
import { capsuleSvg, levelOf } from "#src/pet/capsule-svg.ts";
import { fillTemplate } from "#src/pet/fill-template.ts";
import { formatTokens, formatUsd, withCommas } from "#src/pet/format-tokens.ts";
import {
  githubHeatmap,
  heatmapSvg,
  usageHeatmap,
} from "#src/pet/heatmap-svg.ts";
import { mergesSvg } from "#src/pet/merges-svg.ts";
import { trendSvg } from "#src/pet/trend-svg.ts";
import type { PetCopy, PublicPetState, Range } from "#src/pet/types.ts";
import { Drawing } from "./drawing.tsx";
import { useContentWidth } from "./use-content-width.ts";

type View = ReturnType<typeof buildView>;

type PetSectionsProps = {
  state: PublicPetState;
  view: View;
  today: string;
  range: Range;
  copy: PetCopy;
  isFirstData: boolean;
  isFirstRange: boolean;
  onRangeChange: (range: Range) => void;
};

/**
 * What the owner comes back for, in the order it matters: the usage limits, then growth, then
 * the records, quieter. A section with nothing to show is not there. From `md` the limits and
 * growth share a column beside the records.
 */
export function PetSections({
  state,
  view,
  today,
  range,
  copy,
  isFirstData,
  isFirstRange,
  onRangeChange,
}: PetSectionsProps) {
  const [width, measureRef] = useContentWidth();
  const days = buildDays(state, today, range);
  const recent = buildDays(state, today, "30");
  const growth = tilesInputFor(recent, width, copy);
  const trend = trendDays(days);
  const used = usedText(days, copy);
  const hasLimits = view.windows.length > 0;
  const hasRecords =
    trend.length >= 2 ||
    days.merged.prs > 0 ||
    (state.firstDay !== null && used !== null) ||
    state.github !== null;

  return (
    <div css={[styles.grid, hasRecords && hasLimits && styles.twoColumns]}>
      <div ref={measureRef} css={stack.group}>
        {hasLimits ? (
          <LimitsSection view={view} width={width} copy={copy} />
        ) : null}
        {growth === null ? null : (
          <Section title={t({ en: "Growth", zh: "成长" })}>
            <dl css={styles.figures}>
              <Figure
                label={copy.tiles.streak}
                value={String(growth.streak)}
                unit={copy.tiles.streakUnit}
              />
              <Figure
                label={copy.view.tokensRecent}
                value={formatTokens(growth.tokens)}
              />
            </dl>
          </Section>
        )}
      </div>
      {hasRecords ? (
        <div css={stack.group}>
          <Section
            title={t({ en: "Records", zh: "记录" })}
            aside={
              <SegmentedControl
                aria-label={t({ en: "Range", zh: "时间范围" })}
                size="sm"
                value={range}
                onChange={onRangeChange}
                options={[
                  { value: "30", label: t({ en: "30 days", zh: "30 天" }) },
                  { value: "all", label: t({ en: "All", zh: "全部" }) },
                ]}
              />
            }
          >
            <div css={stack.group}>
              {trend.length < 2 ? null : (
                <Record title={t({ en: "Daily tokens", zh: "每日 token" })}>
                  <Drawing
                    svg={trendSvg(width, trend, isFirstRange, copy) ?? ""}
                    alt={fillTemplate(
                      t({
                        en: "Daily tokens over the last {n} days. {stats}",
                        zh: "每日 token，最近 {n} 天，{stats}",
                      }),
                      { n: trend.length, stats: trendText(trend, copy) },
                    )}
                  />
                </Record>
              )}
              {days.merged.prs === 0 ? null : (
                <Record
                  title={t({ en: "Daily merges", zh: "每日合并" })}
                  aside={mergedText(days, copy)}
                >
                  <Drawing
                    svg={
                      mergesSvg(width, days.mergeDays, isFirstRange, copy) ?? ""
                    }
                    alt={fillTemplate(
                      t({
                        en: "{prs} PRs merged in the last {days} days: {added} lines added, {deleted} removed",
                        zh: "最近 {days} 天合并 {prs} 个 PR：新增 {added} 行，删除 {deleted} 行",
                      }),
                      {
                        days: days.mergeDays.length,
                        prs: days.merged.prs,
                        added: withCommas(days.merged.additions),
                        deleted: withCommas(days.merged.deletions),
                      },
                    )}
                  />
                </Record>
              )}
              {state.firstDay === null || used === null ? null : (
                <Record
                  title={t({ en: "Claude usage", zh: "Claude 使用" })}
                  aside={used}
                >
                  <Drawing
                    svg={heatmapSvg(
                      { width, today, isIntro: isFirstData, copy },
                      usageHeatmap(state.days, state.firstDay),
                    )}
                    alt={fillTemplate(
                      t({
                        en: "Claude usage, {used}",
                        zh: "Claude 使用，{used}",
                      }),
                      { used },
                    )}
                  />
                </Record>
              )}
              {state.github === null ? null : (
                <Record
                  title={t({
                    en: "GitHub contributions",
                    zh: "GitHub 贡献",
                  })}
                  aside={githubText(state.github.total, copy)}
                >
                  <Drawing
                    svg={heatmapSvg(
                      { width, today, isIntro: isFirstData, copy },
                      githubHeatmap(state.github.start, state.github.levels),
                    )}
                    alt={fillTemplate(
                      t({
                        en: "GitHub contributions, {total}",
                        zh: "GitHub 贡献，{total}",
                      }),
                      { total: githubText(state.github.total, copy) },
                    )}
                  />
                </Record>
              )}
              {days.totals === null ? null : (
                <CostLine days={days} copy={copy} />
              )}
            </div>
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function LimitsSection({
  view,
  width,
  copy,
}: {
  view: View;
  width: number;
  copy: PetCopy;
}) {
  const quotaAt = view.state.quota?.at;
  const capsuleAltTemplate = t({
    en: "{label}: {pct}% used",
    zh: "{label}已用 {pct}%",
  });

  return (
    <Section
      title={t({ en: "Usage limits", zh: "额度" })}
      aside={
        view.isStaleQuota && quotaAt != null
          ? updatedText(quotaAt, view.now, copy)
          : null
      }
    >
      <div css={stack.item}>
        {view.windows.map((w) => {
          const projected =
            w.forecast === null ? null : Math.round(w.forecast.projected);
          const sentence = forecastText(w, view.now, view.tz, copy);
          const isOver = levelOf(w.limit.pct, projected) === "over";
          return (
            <div key={w.kind} css={stack.tight}>
              <div css={styles.between}>
                <Text as="span" look="caption" tone="muted">
                  {w.label}
                </Text>
                <Text as="span" look="caption" tone="muted">
                  {resetText(w, view.now, view.tz, copy)}
                </Text>
              </div>
              <Drawing
                svg={capsuleSvg(width, w.limit.pct, projected, copy)}
                alt={fillTemplate(capsuleAltTemplate, {
                  label: w.label,
                  pct: Math.round(w.limit.pct),
                })}
              />
              {sentence === null ? null : (
                <Text
                  as="span"
                  look="caption"
                  tone={isOver ? "default" : "muted"}
                  css={isOver ? styles.danger : undefined}
                >
                  {sentence}
                </Text>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** What the range cost at API prices, and how much of it the cache saved. */
function CostLine({
  days,
  copy,
}: {
  days: ReturnType<typeof buildDays>;
  copy: PetCopy;
}) {
  const totals = days.totals;
  if (totals === null) return null;
  const todayUsd = days.state.days.find((d) => d.day === days.today)?.costUsd;
  const cost =
    todayUsd === undefined || todayUsd <= 0
      ? fillTemplate(
          t({
            en: "{range}: {cost} at API prices · {hit} cache hits",
            zh: "{range}：按 API 价格折算 {cost} · 缓存命中 {hit}",
          }),
          {
            range: rangeText(days, copy),
            cost: formatUsd(totals.costUsd),
            hit: `${(totals.cacheHitRate * 100).toFixed(1)}%`,
          },
        )
      : fillTemplate(
          t({
            en: "{range}: {cost} at API prices, {today} today · {hit} cache hits",
            zh: "{range}：按 API 价格折算 {cost}，今天 {today} · 缓存命中 {hit}",
          }),
          {
            range: rangeText(days, copy),
            cost: formatUsd(totals.costUsd),
            today: `+${formatUsd(todayUsd)}`,
            hit: `${(totals.cacheHitRate * 100).toFixed(1)}%`,
          },
        );

  return (
    <Text look="caption" tone="muted">
      {cost}
    </Text>
  );
}

function Figure({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div css={styles.figure}>
      <dt css={[typeRole.caption, styles.figureLabel]}>{label}</dt>
      <dd css={styles.figureValue}>
        <span css={[typeRole.h1, typeModifier.numeric]}>{value}</span>
        {unit === undefined ? null : (
          <span css={[typeRole.label, styles.figureUnit]}>{unit}</span>
        )}
      </dd>
    </div>
  );
}

/** A section of the page: a quiet label, a note at its end, and the content. */
function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section css={stack.tight}>
      <div css={styles.between}>
        <Heading
          level={2}
          look="h4"
          weight="semibold"
          css={[typeRole.overline, styles.quiet]}
        >
          {title}
        </Heading>
        {typeof aside === "string" ? (
          <Text as="span" look="caption" tone="muted" css={styles.aside}>
            {aside}
          </Text>
        ) : (
          aside
        )}
      </div>
      {children}
    </section>
  );
}

/** One record: a small title, a note at its end, and the drawing. */
function Record({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <div css={stack.tight}>
      <div css={styles.between}>
        <Heading level={3} look="h4" css={typeRole.label}>
          {title}
        </Heading>
        {aside === undefined ? null : (
          <Text as="span" look="caption" tone="muted" css={styles.aside}>
            {aside}
          </Text>
        )}
      </div>
      {children}
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    columnGap: rhythm.section,
    rowGap: rhythm.group,
  },
  twoColumns: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
  },
  between: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    minBlockSize: space._7,
  },
  aside: {
    textAlign: "end",
  },
  quiet: {
    color: color.fgMuted,
    fontWeight: font.weight_6,
  },
  danger: {
    color: color.fgDanger,
  },
  figures: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: rhythm.item,
    margin: 0,
  },
  figure: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  figureLabel: {
    color: color.fgMuted,
  },
  figureValue: {
    display: "flex",
    alignItems: "baseline",
    gap: rhythm.inline,
    margin: 0,
  },
  figureUnit: {
    color: color.fgMuted,
  },
});
