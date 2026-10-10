"use client";

import * as stylex from "@stylexjs/stylex";
import { Chip } from "@tuja/ui/components/chip";
import { fieldStyles } from "@tuja/ui/components/field-shared.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { isValidDay } from "../domain/dates/to-epoch-day.ts";
import { FieldLabel } from "./field-label.tsx";

interface DateChipsProps {
  value: string;
  today: string;
  onChange: (day: string) => void;
}

/** The date as Today · Yesterday · 2 days ago chips, with the native date input for any other day. */
export function DateChips({ value, today, onChange }: DateChipsProps) {
  const labelId = useId();
  const inputId = useId();
  const choices = [
    { day: today, label: t({ en: "Today", zh: "今天" }) },
    { day: addDays(today, -1), label: t({ en: "Yesterday", zh: "昨天" }) },
    { day: addDays(today, -2), label: t({ en: "2 days ago", zh: "前天" }) },
  ];
  return (
    <div role="group" aria-labelledby={labelId} css={stack.tight}>
      <FieldLabel id={labelId}>{t({ en: "Date", zh: "日期" })}</FieldLabel>
      <div css={cluster.tight}>
        {choices.map((choice) => (
          <Chip
            key={choice.day}
            size="sm"
            isActive={value === choice.day}
            onClick={() => {
              onChange(choice.day);
            }}
          >
            {choice.label}
          </Chip>
        ))}
        <label htmlFor={inputId} css={a11y.srOnly}>
          {t({ en: "Pick a date", zh: "选择日期" })}
        </label>
        <input
          id={inputId}
          type="date"
          value={value}
          max={addDays(today, 366)}
          onChange={(event) => {
            if (isValidDay(event.target.value)) onChange(event.target.value);
          }}
          css={[
            typeRole.controlCaption,
            fieldStyles.control,
            corner.radius_round,
            a11y.focusRing,
            styles.input,
          ]}
        />
      </div>
    </div>
  );
}

const styles = stylex.create({
  input: {
    inlineSize: "auto",
    paddingBlock: space._00,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
});
