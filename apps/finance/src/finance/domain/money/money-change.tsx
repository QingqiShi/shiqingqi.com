"use client";

import { useLocale } from "@tuja/i18n/use-locale";
import { Text } from "@tuja/ui/components/text";
import { formatMoney } from "./format-money.ts";
import { formatPercentChange } from "./format-percent-change.ts";

interface MoneyChangeProps {
  changeMinor: number;
  /** The value the change is measured from; adds a percentage when not 0. */
  fromMinor?: number;
  currency: string;
  /** Colours a rise green and a fall red; leave off where up is not good, such as spending. */
  tone?: boolean;
  /** Whole currency units and a short percentage, for a summary figure. */
  whole?: boolean;
  /** The size of the line it sits in: `"caption"` in a chart readout or a row's detail. */
  look?: "bodySmall" | "caption";
}

/** A signed change in money, such as `+£5,259.27 (+0.95%)`. */
export function MoneyChange({
  changeMinor,
  fromMinor,
  currency,
  tone = false,
  whole = false,
  look = "bodySmall",
}: MoneyChangeProps) {
  const locale = useLocale();
  const percent =
    fromMinor === undefined
      ? null
      : formatPercentChange(changeMinor, fromMinor, locale, { short: whole });
  return (
    <Text
      as="span"
      look={look}
      weight="semibold"
      numeric
      tone={
        tone && changeMinor > 0
          ? "success"
          : tone && changeMinor < 0
            ? "destructive"
            : "default"
      }
    >
      {formatMoney(changeMinor, currency, locale, {
        signDisplay: "exceptZero",
        wholeUnits: whole,
      })}
      {percent === null ? "" : ` (${percent})`}
    </Text>
  );
}
