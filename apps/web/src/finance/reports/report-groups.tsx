"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { chartMarks } from "../charts/chart-marks.stylex.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { assetLiabilitySplit } from "./asset-liability-split.ts";
import { layoutBars } from "./layout-bars.ts";
import { reportGroupBars } from "./report-group-bars.ts";
import { ReportSection } from "./report-section.tsx";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

function percentOf(share: number) {
  return `${String(share * 100)}%`;
}

/**
 * One bar per Group at its balance-sheet total, a liability Group below
 * zero beside the asset Group it is named after, then assets against
 * liabilities as one bar split in two. Every bar carries its value as text,
 * so the bars are only a picture of it.
 */
export function ReportGroups({
  data,
  headingLevel,
}: {
  data: WeeklyReportData;
  headingLevel: 2 | 3;
}) {
  const locale = useLocale();
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const groups = reportGroupBars(data);
  const { zero, bars } = layoutBars(groups.map((group) => group.valueMinor));
  const split = assetLiabilitySplit(data.balanceSheet);
  const shareFormat = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  return (
    <ReportSection
      title={t({ en: "By group", zh: "按分组" })}
      headingLevel={headingLevel}
    >
      <ul css={styles.bars}>
        {groups.map((group, index) => (
          <li key={group.id} css={styles.barItem}>
            <div css={[typeRole.bodySmall, styles.barLabels]}>
              <span>{group.name}</span>
              <span css={typeModifier.numeric}>{money(group.valueMinor)}</span>
            </div>
            <div aria-hidden css={styles.track}>
              {zero > 0 && zero < 1 ? (
                <span css={[styles.zero, styles.at(percentOf(zero))]} />
              ) : null}
              <span
                css={[
                  corner.radius_1,
                  group.valueMinor < 0
                    ? styles.liabilitySegment
                    : chartMarks.primaryKey,
                  styles.bar,
                  styles.extent(
                    percentOf(bars[index].offset),
                    percentOf(bars[index].size),
                  ),
                ]}
              />
            </div>
          </li>
        ))}
      </ul>
      {split.assetsMinor + split.liabilitiesMinor > 0 ? (
        <div css={stack.tight}>
          <Text look="caption" tone="muted">
            {t({ en: "Assets against liabilities", zh: "资产与负债占比" })}
          </Text>
          <div aria-hidden css={styles.split}>
            {split.assetShare > 0 ? (
              <span
                css={[
                  chartMarks.primaryKey,
                  styles.segment,
                  styles.grow(split.assetShare),
                ]}
              />
            ) : null}
            {split.liabilityShare > 0 ? (
              <span
                css={[
                  styles.segment,
                  styles.liabilitySegment,
                  split.assetShare > 0 && styles.segmentGap,
                  styles.grow(split.liabilityShare),
                ]}
              />
            ) : null}
          </div>
          <dl css={[typeRole.bodySmall, styles.splitLabels]}>
            <div css={styles.splitItem}>
              <dt css={styles.keyed}>
                <span css={[styles.key, chartMarks.primaryKey]} />
                {t({ en: "Assets", zh: "资产" })}{" "}
                {shareFormat.format(split.assetShare)}
              </dt>
              <dd css={[typeModifier.numeric, styles.dd]}>
                {money(split.assetsMinor)}
              </dd>
            </div>
            <div css={[styles.splitItem, styles.splitItemEnd]}>
              <dt css={styles.keyed}>
                <span css={[styles.key, styles.liabilitySegment]} />
                {t({ en: "Liabilities", zh: "负债" })}{" "}
                {shareFormat.format(split.liabilityShare)}
              </dt>
              <dd css={[typeModifier.numeric, styles.dd]}>
                {money(split.liabilitiesMinor)}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </ReportSection>
  );
}

const styles = stylex.create({
  bars: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  barItem: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
  barLabels: {
    display: "flex",
    justifyContent: "space-between",
    gap: rhythm.tight,
  },
  track: {
    position: "relative",
    blockSize: space._1,
  },
  zero: {
    position: "absolute",
    insetBlock: `calc(-1 * ${space._1})`,
    inlineSize: "1px",
    backgroundColor: color.fgMuted,
  },
  at: (offset: string) => ({
    insetInlineStart: offset,
  }),
  bar: {
    position: "absolute",
    insetBlock: 0,
    minInlineSize: "2px",
  },
  extent: (offset: string, size: string) => ({
    insetInlineStart: offset,
    inlineSize: size,
  }),
  split: {
    display: "flex",
    blockSize: space._3,
    overflow: "hidden",
  },
  segment: {
    display: "block",
    blockSize: "100%",
  },
  segmentGap: {
    borderInlineStartWidth: "2px",
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.bgCanvas,
  },
  liabilitySegment: {
    backgroundColor: color.fgMuted,
  },
  grow: (share: number) => ({
    flexGrow: share,
    flexBasis: 0,
  }),
  splitLabels: {
    display: "flex",
    justifyContent: "space-between",
    gap: rhythm.item,
    margin: 0,
  },
  splitItem: {
    display: "flex",
    flexDirection: "column",
  },
  splitItemEnd: {
    alignItems: "end",
    textAlign: "end",
  },
  keyed: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
    color: color.fgMuted,
  },
  key: {
    display: "inline-block",
    inlineSize: space._2,
    blockSize: space._2,
  },
  dd: {
    margin: 0,
  },
});
