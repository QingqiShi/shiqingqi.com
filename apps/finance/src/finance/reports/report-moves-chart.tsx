"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { formatMoney } from "../domain/money/format-money.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { fillTemplate } from "./fill-template.ts";
import { groupMoves } from "./group-moves.ts";
import { ReportBarList } from "./report-bar-list.tsx";
import { ReportSection } from "./report-section.tsx";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/**
 * What each Group added to or took from net worth over the week, the
 * largest change first, as bars either side of zero. The changes add up to
 * the week's change in net worth, which closes the list.
 */
export function ReportMovesChart({
  data,
  headingLevel,
}: {
  data: WeeklyReportData;
  headingLevel: 2 | 3;
}) {
  const locale = useLocale();
  const currency = data.baseCurrency;
  const { moved, unchanged } = groupMoves(data);
  const change = (minor: number) =>
    formatMoney(minor, currency, locale, { signDisplay: "exceptZero" });
  const listSeparator = t({ en: ", ", zh: "、" });

  return (
    <ReportSection
      title={t({ en: "What moved", zh: "本周变化" })}
      headingLevel={headingLevel}
    >
      {moved.length === 0 ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "No group changed in value this week.",
            zh: "本周各分组的金额都没有变化。",
          })}
        </Text>
      ) : (
        <div css={stack.tight}>
          <ReportBarList
            bars={moved.map(({ group, changeMinor }) => ({
              key: group.id,
              label: group.name,
              valueMinor: changeMinor,
              value: change(changeMinor),
            }))}
          />
          <p css={[typeRole.bodySmall, styles.total]}>
            <span css={styles.totalLabel}>
              {t({ en: "Net worth", zh: "净资产" })}
            </span>
            <MoneyChange
              changeMinor={data.comparisons.previousWeek.changeMinor}
              fromMinor={data.comparisons.previousWeek.netWorthMinor}
              currency={currency}
              tone
            />
          </p>
          {unchanged.length === 0 ? null : (
            <Text as="p" look="caption" tone="muted">
              {fillTemplate(
                t({ en: "No change: {list}", zh: "没有变化：{list}" }),
                {
                  list: unchanged
                    .map((group) => group.name)
                    .join(listSeparator),
                },
              )}
            </Text>
          )}
        </div>
      )}
    </ReportSection>
  );
}

const styles = stylex.create({
  total: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: rhythm.item,
    margin: 0,
    paddingBlockStart: space._1,
    borderBlockStartWidth: "1px",
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  totalLabel: {
    fontWeight: font.weight_6,
  },
});
