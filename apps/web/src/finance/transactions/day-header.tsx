"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm } from "@tuja/ui/tokens.stylex";
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
      <div css={[flex.between, dayHeader.rule, styles.rule]}>
        <Heading level={level} css={[typeRole.label, styles.label]}>
          {label}
        </Heading>
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  rule: {
    gap: rhythm.tight,
  },
  label: {
    fontWeight: font.weight_6,
  },
});
