"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { color } from "../color.stylex.ts";
import { typeModifier } from "../primitives/type.stylex.ts";
import { controlSize } from "../tokens.stylex.ts";
import { TextField, type TextFieldProps } from "./text-field.tsx";

/**
 * The props that a `DateField` and a `TimeField` share with a `TextField`.
 *
 * @internal
 */
export type TemporalFieldProps = Omit<
  TextFieldProps,
  | "type"
  | "value"
  | "defaultValue"
  | "onChange"
  | "leading"
  | "trailing"
  | "placeholder"
  | "inputMode"
  | "controlCss"
  | "min"
  | "max"
  | "step"
  | "list"
  | "pattern"
  | "minLength"
  | "maxLength"
>;

interface TemporalFieldOwnProps extends TemporalFieldProps {
  kind: "date" | "time";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  min?: string;
  max?: string;
}

const WHOLE = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}$/,
};

/**
 * A native date or time input in the frame of a `TextField`. It reports a
 * whole value or `""`, and keeps a value that the visitor has half typed on
 * the screen until it is whole.
 *
 * @internal
 */
export function TemporalField({
  kind,
  value,
  defaultValue,
  onValueChange,
  max,
  ...rest
}: TemporalFieldOwnProps) {
  // While a day is half typed, the input's value is "". A controlled input
  // would then take back the last whole value and lose what was typed, so
  // the input shows its own value until the parent gives a new one.
  const [given, setGiven] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== given) {
    setGiven(value);
    setShown(value);
  }

  return (
    <TextField
      {...rest}
      type={kind}
      value={value === undefined ? undefined : shown}
      defaultValue={defaultValue}
      // Without a `max`, Chrome takes a year of up to six figures.
      max={max ?? (kind === "date" ? "9999-12-31" : undefined)}
      controlCss={[typeModifier.numeric, styles.control, styles[kind]]}
      onChange={(event) => {
        const next = event.target.value;
        if (value !== undefined) setShown(next);
        const isWhole =
          next === ""
            ? !event.target.validity.badInput
            : WHOLE[kind].test(next);
        if (isWhole) onValueChange?.(next);
      }}
    />
  );
}

// Masks: only the alpha of each image counts. The spaces and brackets are
// percent-encoded, so that the data URI is valid CSS.
const CALENDAR_MASK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cg%20fill='none'%20stroke='black'%20stroke-width='1.5'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Crect%20x='2.25'%20y='3.25'%20width='11.5'%20height='10.5'%20rx='1.75'/%3E%3Cpath%20d='M2.25%206.75h11.5M5.25%201.75v3M10.75%201.75v3'/%3E%3C/g%3E%3C/svg%3E";
const CLOCK_MASK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cg%20fill='none'%20stroke='black'%20stroke-width='1.5'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Ccircle%20cx='8'%20cy='8'%20r='6.25'/%3E%3Cpath%20d='M8%204.5V8l2.25%201.5'/%3E%3C/g%3E%3C/svg%3E";

const styles = stylex.create({
  control: {
    // iOS centres the value, and a field shows its text at the start.
    "::-webkit-date-and-time-value": {
      textAlign: "start",
      margin: 0,
    },
    "::-webkit-datetime-edit": {
      padding: 0,
    },
    // The button that opens the picker, which only Blink draws. Its own
    // glyph has a fixed colour, so the glyph here follows the theme, as the
    // affixes of a `TextField` do.
    "::-webkit-calendar-picker-indicator": {
      flexShrink: 0,
      inlineSize: controlSize._4,
      blockSize: controlSize._4,
      padding: 0,
      marginInlineStart: controlSize._2,
      backgroundImage: "none",
      backgroundColor: color.mutedForeground,
      maskRepeat: "no-repeat",
      maskPosition: "center",
      maskSize: "100% 100%",
      opacity: 1,
      cursor: "pointer",
      visibility: { default: null, ":is(:disabled, :read-only)": "hidden" },
    },
  },
  date: {
    "::-webkit-calendar-picker-indicator": {
      maskImage: `url("${CALENDAR_MASK}")`,
    },
  },
  time: {
    "::-webkit-calendar-picker-indicator": {
      maskImage: `url("${CLOCK_MASK}")`,
    },
  },
});
