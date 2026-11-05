"use client";

import {
  outlineSurface,
  outlineSurfaceSize,
} from "@tuja/ui/components/outline-surface.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
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

/**
 * A date input that matches an outline `Button` beside it, with a hidden label.
 * It reports only valid `YYYY-MM-DD` days.
 */
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
          outlineSurface.layout,
          outlineSurface.skin,
          outlineSurfaceSize[size],
          corner.squircle_round,
          outlineSurface.interactive,
          css,
        ]}
      />
    </>
  );
}
