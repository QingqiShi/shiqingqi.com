"use client";

import * as stylex from "@stylexjs/stylex";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";

/**
 * A box with no visible label. A tap around the box counts as a tap on the box,
 * because a hidden label leaves it too small for a finger.
 */
export function TickBox({
  label,
  checked,
  disabled = false,
  autoFocus = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      css={[a11y.touchTarget, styles.box]}
      onClick={(event) => {
        if (event.target === event.currentTarget && !disabled) {
          onChange(!checked);
        }
      }}
    >
      <Checkbox
        label={label}
        labelHidden
        checked={checked}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
    </div>
  );
}

const styles = stylex.create({
  box: {
    display: "flex",
    flexShrink: 0,
  },
});
