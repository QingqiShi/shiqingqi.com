"use client";

import * as stylex from "@stylexjs/stylex";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { isValidDay } from "../domain/dates/to-epoch-day.ts";

interface DayChipsProps {
  value: string;
  today: string;
  onChange: (day: string) => void;
}

type DayChoice = "today" | "yesterday" | "other";

/** Today · Yesterday · a picked day, for the day a balance is true at the end of. */
export function DayChips({ value, today, onChange }: DayChipsProps) {
  const yesterday = addDays(today, -1);
  const [picking, setPicking] = useState(
    value !== today && value !== yesterday,
  );
  const choice: DayChoice = picking
    ? "other"
    : value === yesterday
      ? "yesterday"
      : "today";
  return (
    <div css={[cluster.tight, styles.root]}>
      <SegmentedControl<DayChoice>
        size="sm"
        aria-label={t({ en: "Day", zh: "日期" })}
        options={[
          { value: "today", label: t({ en: "Today", zh: "今天" }) },
          { value: "yesterday", label: t({ en: "Yesterday", zh: "昨天" }) },
          { value: "other", label: t({ en: "Other day", zh: "其他日期" }) },
        ]}
        value={choice}
        onChange={(next) => {
          setPicking(next === "other");
          if (next === "today") onChange(today);
          if (next === "yesterday") onChange(yesterday);
        }}
      />
      {picking ? (
        <TextField
          size="sm"
          type="date"
          label={t({ en: "Day", zh: "日期" })}
          labelHidden
          value={value}
          max={today}
          onChange={(event) => {
            if (isValidDay(event.target.value)) onChange(event.target.value);
          }}
        />
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  root: {
    alignItems: "center",
  },
});
