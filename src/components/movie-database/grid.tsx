import * as stylex from "@stylexjs/stylex";
import type { HTMLAttributes, PropsWithChildren, Ref } from "react";
import { breakpoints } from "@/breakpoints";

export function Grid({
  children,
  ref,
  ...props
}: PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }
>) {
  return (
    <div {...props} ref={ref} css={styles.skeletonGrid}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  skeletonGrid: {
    padding: "0.5rem",
    display: "grid",
    gap: "0.5rem",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.sm]: "repeat(auto-fill, minmax(150px, 1fr))",
      [breakpoints.md]: "repeat(auto-fill, minmax(230px, 1fr))",
      [breakpoints.lg]: "repeat(auto-fill, minmax(300px, 1fr))",
    },
  },
});
