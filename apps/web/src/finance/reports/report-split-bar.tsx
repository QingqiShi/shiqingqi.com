"use client";

import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { chartMarks } from "../charts/chart-marks.stylex.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { assetLiabilitySplit } from "./asset-liability-split.ts";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/** Assets against liabilities as one bar split in two, each part with its total and share. */
export function ReportSplitBar({ data }: { data: WeeklyReportData }) {
  const locale = useLocale();
  const split = assetLiabilitySplit(data.balanceSheet);
  if (split.assetsMinor + split.liabilitiesMinor === 0) return null;
  const money = (minor: number) =>
    formatMoney(minor, data.baseCurrency, locale);
  const shareFormat = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const sides = [
    {
      key: "assets",
      label: t({ en: "Assets", zh: "资产" }),
      minor: split.assetsMinor,
      share: split.assetShare,
      keyStyle: chartMarks.primaryKey,
    },
    {
      key: "liabilities",
      label: t({ en: "Liabilities", zh: "负债" }),
      minor: split.liabilitiesMinor,
      share: split.liabilityShare,
      keyStyle: chartMarks.neutralKey,
    },
  ];

  return (
    <div css={stack.tight}>
      <div aria-hidden css={styles.bar}>
        {sides.map((side) =>
          side.share > 0 ? (
            <span
              key={side.key}
              css={[styles.segment, side.keyStyle, styles.grow(side.share)]}
            />
          ) : null,
        )}
      </div>
      <dl css={[typeRole.bodySmall, styles.labels]}>
        {sides.map((side) => (
          <div key={side.key} css={styles.item}>
            <dt css={styles.keyed}>
              <span css={[styles.key, side.keyStyle]} />
              {side.label}{" "}
              <span css={typeModifier.numeric}>
                {shareFormat.format(side.share)}
              </span>
            </dt>
            <dd css={[typeModifier.numeric, styles.value]}>
              {money(side.minor)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const styles = stylex.create({
  bar: {
    display: "flex",
    gap: rhythm.inline,
    blockSize: space._3,
  },
  segment: {
    display: "block",
    blockSize: "100%",
    minInlineSize: "2px",
    borderRadius: "2px",
    cornerShape: "round",
  },
  grow: (share: number) => ({
    flexGrow: share,
    flexBasis: 0,
  }),
  labels: {
    display: "flex",
    justifyContent: "space-between",
    gap: rhythm.item,
    margin: 0,
  },
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: { default: "start", ":last-child": "end" },
    textAlign: { default: "start", ":last-child": "end" },
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
    borderRadius: "2px",
    cornerShape: "round",
  },
  value: {
    margin: 0,
    fontWeight: font.weight_6,
  },
});
