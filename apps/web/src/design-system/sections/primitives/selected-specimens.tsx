"use client";

import * as stylex from "@stylexjs/stylex";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { selected, selectedTokens } from "@tuja/ui/primitives/selected.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";

const RANGES = ["day", "week", "month"] as const;
type Range = (typeof RANGES)[number];

const BILLING = ["monthly", "yearly"] as const;
type Billing = (typeof BILLING)[number];

export function QuietSelectedSpecimen() {
  const [range, setRange] = useState<Range>("week");
  const { getOptionProps } = useRadioGroup({
    values: RANGES,
    value: range,
    onChange: setRange,
  });
  const labels: Record<Range, string> = {
    day: t({ en: "Day", zh: "日" }),
    week: t({ en: "Week", zh: "周" }),
    month: t({ en: "Month", zh: "月" }),
  };

  return (
    <div
      role="radiogroup"
      aria-label={t({ en: "Range", zh: "范围" })}
      css={[row.inline, corner.radius_round, styles.segments]}
      data-testid="selected-quiet-specimen"
    >
      {RANGES.map((option) => (
        <button
          key={option}
          type="button"
          {...getOptionProps(option)}
          css={[
            typeRole.label,
            buttonReset.base,
            corner.radius_round,
            styles.segment,
            selected.quiet,
            transition.colors,
          ]}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export function MarkedSelectedSpecimen() {
  const [billing, setBilling] = useState<Billing>("yearly");
  const { getOptionProps } = useRadioGroup({
    values: BILLING,
    value: billing,
    onChange: setBilling,
  });
  const labels: Record<Billing, { label: string; price: string }> = {
    monthly: {
      label: t({ en: "Monthly", zh: "按月" }),
      price: t({ en: "£8 a month", zh: "每月 £8" }),
    },
    yearly: {
      label: t({ en: "Yearly", zh: "按年" }),
      price: t({ en: "£80 a year", zh: "每年 £80" }),
    },
  };

  return (
    <div
      role="radiogroup"
      aria-label={t({ en: "Billing", zh: "计费方式" })}
      css={[stack.item, styles.cards]}
      data-testid="selected-marked-specimen"
    >
      {BILLING.map((option) => (
        <button
          key={option}
          type="button"
          {...getOptionProps(option)}
          css={[
            buttonReset.base,
            stack.tight,
            corner.radius_3,
            styles.card,
            selected.marked,
            transition.colors,
          ]}
        >
          <span css={typeRole.label}>{labels[option].label}</span>
          <span css={[typeRole.caption, styles.price]}>
            {labels[option].price}
          </span>
        </button>
      ))}
    </div>
  );
}

const styles = stylex.create({
  segments: {
    padding: space._0,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 ${border.size_1} ${color.border}`,
  },
  segment: {
    paddingBlock: space._1,
    paddingInline: space._3,
    color: color.fg,
  },
  cards: {
    inlineSize: "100%",
    maxInlineSize: "16rem",
  },
  card: {
    alignItems: "flex-start",
    paddingBlock: space._2,
    paddingInline: space._3,
    textAlign: "start",
    color: color.fg,
    borderWidth: border.size_2,
    borderStyle: "solid",
    [selectedTokens.rest]: color.bgCanvas,
  },
  price: {
    color: color.fgMuted,
  },
});
