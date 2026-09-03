import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { layer } from "../tokens.stylex.ts";
import { tableTokens } from "./table.stylex.ts";

/** The `<thead>` group. Sticks when the root sets `stickyHeader`. */
export function TableHead({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"thead">, "className" | "style">) {
  return (
    <thead {...restProps} ref={ref} css={[styles.head, css]}>
      {children}
    </thead>
  );
}

const styles = stylex.create({
  head: {
    position: "sticky",
    insetBlockStart: tableTokens.headInset,
    zIndex: layer.content,
    backgroundColor: tableTokens.headBackground,
  },
});
