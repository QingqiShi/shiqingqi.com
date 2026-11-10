"use client";

import * as stylex from "@stylexjs/stylex";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";

/**
 * A box with no visible label. A tap around the box counts as a tap on the box,
 * because a hidden label leaves it too small for a finger.
 */
export function TickBox({
  label,
  checked,
  readOnly = false,
  look,
  autoFocus = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  /**
   * `"done"`: the box says that a task is done, so ticked it recedes as a
   * done title does. `"selection"`: the box picks a row for an action.
   */
  look?: "done" | "selection";
  /** Show the state with no way to change it, with no box: a dot when open, a check mark when done. */
  readOnly?: boolean;
  autoFocus?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      css={[
        styles.box,
        readOnly ? [typeRole.body, styles.titleLine] : a11y.touchTarget,
      ]}
      onClick={(event) => {
        if (!readOnly && event.target === event.currentTarget) {
          onChange(!checked);
        }
      }}
    >
      <Checkbox
        label={label}
        labelHidden
        checked={checked}
        readOnly={readOnly}
        look={look}
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
  // The read-only mark is centred on the title's first line, so that its dot
  // sits at the middle of the title's lowercase letters.
  titleLine: {
    alignItems: "center",
    blockSize: "1lh",
  },
});
