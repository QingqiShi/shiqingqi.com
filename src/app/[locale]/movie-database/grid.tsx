import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { breakpoints } from "@/breakpoints";

export function Grid({ children }: PropsWithChildren) {
  return <div css={styles.skeletonGrid}>{children}</div>;
}

const styles = stylex.create({
  skeletonGrid: {
    marginTop: "4.5rem",
    padding: "0.5rem",
    display: "grid",
    gap: "0.5rem",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.sm]: "repeat(auto-fill, minmax(250px, 1fr))",
    },
  },
});
