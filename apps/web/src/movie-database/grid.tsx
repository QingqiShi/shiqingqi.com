import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { HTMLAttributes, PropsWithChildren, Ref } from "react";

export function Grid({
  children,
  ref,
  ...props
}: PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }
>) {
  return (
    <div {...props} ref={ref} css={[pageColumn.base, styles.grid]}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: rhythm.item,
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.sm]: "repeat(auto-fill, minmax(150px, 1fr))",
      [breakpoints.md]: "repeat(auto-fill, minmax(230px, 1fr))",
      [breakpoints.lg]: "repeat(auto-fill, minmax(300px, 1fr))",
    },
  },
});
