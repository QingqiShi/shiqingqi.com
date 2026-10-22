"use client";

import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { displayDay } from "../domain/dates/display-day.ts";

interface DayHeaderProps {
  day: string;
  today: string;
  locale: string;
  level?: 3 | 4;
  children?: ReactNode;
}

export function DayHeader({
  day,
  today,
  locale,
  level = 3,
  children,
}: DayHeaderProps) {
  const todayLabel = t({ en: "Today", zh: "今天" });
  const label =
    day === today
      ? `${todayLabel} · ${displayDay(day, locale, "weekday")}`
      : displayDay(
          day,
          locale,
          day.slice(0, 4) === today.slice(0, 4) ? "weekday" : "weekdayYear",
        );
  return (
    <div css={[plainList.row, styles.day]}>
      <div css={[flex.between, styles.rule]}>
        <Heading level={level} css={[typeRole.label, styles.label]}>
          {label}
        </Heading>
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  day: {
    paddingBlockStart: space._3,
  },
  rule: {
    gap: rhythm.tight,
    paddingBlockEnd: space._1,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  label: {
    fontWeight: font.weight_6,
  },
});
