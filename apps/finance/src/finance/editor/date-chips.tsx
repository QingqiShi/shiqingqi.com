"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { DateField } from "@tuja/ui/components/date-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useId } from "react";
import { addDays } from "../domain/dates/add-days.ts";
import { FieldLabel, type LabelMark } from "./field-label.tsx";

interface DateChipsProps {
  value: string;
  today: string;
  onChange: (day: string) => void;
  mark?: LabelMark;
}

/** The date as Today · Yesterday · 2 days ago chips, with the native date input for any other day. */
export function DateChips({ value, today, onChange, mark }: DateChipsProps) {
  const labelId = useId();
  const choices = [
    { day: today, label: t({ en: "Today", zh: "今天" }) },
    { day: addDays(today, -1), label: t({ en: "Yesterday", zh: "昨天" }) },
    { day: addDays(today, -2), label: t({ en: "2 days ago", zh: "前天" }) },
  ];
  return (
    <div role="group" aria-labelledby={labelId} css={stack.tight}>
      <FieldLabel id={labelId} mark={mark}>
        {t({ en: "Date", zh: "日期" })}
      </FieldLabel>
      <div css={cluster.tight}>
        {choices.map((choice) => (
          <Button
            look="outline"
            key={choice.day}
            size="sm"
            isActive={value === choice.day}
            onClick={() => {
              onChange(choice.day);
            }}
          >
            {choice.label}
          </Button>
        ))}
        <DateField
          size="sm"
          label={t({ en: "Pick a date", zh: "选择日期" })}
          labelHidden
          value={value}
          max={addDays(today, 366)}
          onValueChange={(day) => {
            if (day) onChange(day);
          }}
          css={styles.date}
        />
      </div>
    </div>
  );
}

const styles = stylex.create({
  date: {
    inlineSize: "auto",
  },
});
