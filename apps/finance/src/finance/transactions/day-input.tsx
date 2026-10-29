"use client";

import { chipSize, chipSurface } from "@tuja/ui/components/chip.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { useId } from "react";
import { isValidDay } from "../domain/dates/to-epoch-day.ts";

interface DayInputProps {
  label: string;
  value: string;
  onChange: (day: string) => void;
  size?: "xs" | "sm";
  css?: StyleProp;
}

/** A chip-sized date input with a hidden label; it reports only valid `YYYY-MM-DD` days. */
export function DayInput({
  label,
  value,
  onChange,
  size = "sm",
  css,
}: DayInputProps) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} css={a11y.srOnly}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => {
          if (isValidDay(event.target.value)) onChange(event.target.value);
        }}
        css={[
          size === "xs" ? typeRole.caption : typeRole.label,
          chipSurface.base,
          chipSize[size],
          chipSurface.interactive,
          css,
        ]}
      />
    </>
  );
}
