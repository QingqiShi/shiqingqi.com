"use client";

import * as stylex from "@stylexjs/stylex";
import { use, type ComponentProps, type ReactNode } from "react";
import { buttonReset } from "../primitives/reset.stylex.ts";
import type { StyleProp } from "../types.ts";
import { TableDisclosureContext } from "./table-disclosure-context.ts";

interface TableDisclosureTriggerProps extends Omit<
  ComponentProps<"button">,
  "type" | "onClick" | "className" | "style"
> {
  /**
   * The button's text, which is also its accessible name, such as the label
   * of the row.
   *
   * @zh 按钮的文字，也是它的无障碍名称，例如这一行的标签。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the button's own.
   *
   * @zh 合并在按钮自身样式之上的 StyleX 样式。
   */
  css?: StyleProp;
}

/**
 * The one control of a `TableDisclosure` row, for the keyboard and for a
 * screen reader: a `<button>` with `aria-expanded` and `aria-controls`. It
 * takes the type of the cell it is in. Put it in a cell of the row's
 * `summary`.
 */
export function TableDisclosureTrigger({
  css,
  ref,
  children,
  ...restProps
}: TableDisclosureTriggerProps) {
  const triggerProps = use(TableDisclosureContext);
  if (triggerProps === null) {
    throw new Error(
      "TableDisclosureTrigger must be in the summary of a TableDisclosure.",
    );
  }
  return (
    <button
      {...restProps}
      {...triggerProps}
      ref={ref}
      css={[buttonReset.base, styles.trigger, css]}
    >
      {children}
    </button>
  );
}

const styles = stylex.create({
  trigger: {
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    lineHeight: "inherit",
    letterSpacing: "inherit",
    color: "inherit",
    textAlign: "start",
  },
});
