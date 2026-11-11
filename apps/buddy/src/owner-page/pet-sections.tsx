"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
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
import { withCommas } from "#src/pet/format-tokens.ts";
import {
  githubHeatmap,
  heatmapSvg,
  usageHeatmap,
} from "#src/pet/heatmap-svg.ts";
import { mergesSvg } from "#src/pet/merges-svg.ts";
import { trendSvg } from "#src/pet/trend-svg.ts";
import type { PetCopy, PublicPetState, Range } from "#src/pet/types.ts";
import { Drawing } from "./drawing.tsx";
import { PetTiles } from "./pet-tiles.tsx";
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
 * What the owner comes back for, in the order it matters: the usage limits, then the records of
 * the range, then the whole history, quieter. A section with nothing to show is not there. From
 * `md` the records of the range take the second column, and the history goes below the limits, so
 * that the two columns are near the same height.
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
  const tiles = tilesInputFor(days, width, copy);
  const trend = trendDays(days);
  const used = usedText(days, copy);
  const hasLimits = view.windows.length > 0;
  const hasRange = tiles !== null || trend.length >= 2 || days.merged.prs > 0;
  const hasHistory =
    (state.firstDay !== null && used !== null) || state.github !== null;
  const isTwoColumns = hasLimits && hasRange;

  return (
    <div css={[styles.grid, isTwoColumns && styles.twoColumns]}>
      <div
        ref={measureRef}
        css={[stack.group, isTwoColumns && styles.limitsArea]}
      >
        {hasLimits ? (
          <LimitsSection view={view} width={width} copy={copy} />
        ) : null}
      </div>
      {hasRange ? (
        <div css={[stack.group, isTwoColumns && styles.rangeArea]}>
          <Section
            title={t({ en: "Records", zh: "记录" })}
            aside={
              <div css={styles.rangeBar}>
                <Text as="span" look="caption" tone="muted" css={styles.aside}>
                  {rangeText(days, copy)}
                </Text>
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
              </div>
            }
          >
            <div css={stack.group}>
              {tiles === null ? null : <PetTiles tiles={tiles} copy={copy} />}
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
            </div>
          </Section>
        </div>
      ) : null}
      {hasHistory ? (
        <div css={[stack.group, isTwoColumns && styles.historyArea]}>
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
                  tone={isOver ? "destructive" : "muted"}
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
    gridTemplateRows: {
      default: null,
      [breakpoints.md]: "auto 1fr",
    },
    gridTemplateAreas: {
      default: null,
      [breakpoints.md]: '"limits range" "history range"',
    },
  },
  limitsArea: {
    gridArea: { default: null, [breakpoints.md]: "limits" },
  },
  rangeArea: {
    gridArea: { default: null, [breakpoints.md]: "range" },
  },
  historyArea: {
    gridArea: { default: null, [breakpoints.md]: "history" },
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
    color: color.mutedForeground,
    fontWeight: font.weight_6,
  },
  rangeBar: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    minInlineSize: 0,
  },
});
