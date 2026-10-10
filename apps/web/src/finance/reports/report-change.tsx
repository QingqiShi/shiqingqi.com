"use client";

import * as stylex from "@stylexjs/stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { formatPercentChange } from "../accounts/format-percent-change.ts";
import { formatMoney } from "../domain/money/format-money.ts";

interface ReportChangeProps {
  changeMinor: number;
  /** The value the change is measured from; adds a percentage when not 0. */
  fromMinor?: number;
  currency: string;
  /** Colours a rise green and a fall red; leave off where up is not good, such as spending. */
  tone?: boolean;
}

/** A signed change in money, such as `+£5,259.27 (+0.95%)`. */
export function ReportChange({
  changeMinor,
  fromMinor,
  currency,
  tone = false,
}: ReportChangeProps) {
  const locale = useLocale();
  const percent =
    fromMinor === undefined
      ? null
      : formatPercentChange(changeMinor, fromMinor, locale);
  return (
    <span
      css={[
        typeModifier.numeric,
        styles.change,
        tone && changeMinor > 0 && styles.up,
        tone && changeMinor < 0 && styles.down,
      ]}
    >
      {formatMoney(changeMinor, currency, locale, {
        signDisplay: "exceptZero",
      })}
      {percent === null ? "" : ` (${percent})`}
    </span>
  );
}

const styles = stylex.create({
  change: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  up: {
    color: color.fgSuccess,
  },
  down: {
    color: color.fgDanger,
  },
});
