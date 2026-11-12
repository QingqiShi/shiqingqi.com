"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Divider } from "@tuja/ui/components/divider";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { displayDay } from "../domain/dates/display-day.ts";
import { dayHeader } from "./day-header.stylex.ts";

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
    <div css={[plainList.row, dayHeader.day]}>
      <div css={[flex.between, styles.rule]}>
        {level === 3 ? (
          <h3 css={[typeRole.label, styles.label]}>{label}</h3>
        ) : (
          <h4 css={[typeRole.label, styles.label]}>{label}</h4>
        )}
        {children}
      </div>
      <Divider />
    </div>
  );
}

const styles = stylex.create({
  label: {
    margin: 0,
    color: color.mutedForeground,
  },
  rule: {
    gap: rhythm.tight,
    paddingBlockEnd: space._1,
  },
});
