import * as stylex from "@stylexjs/stylex";
import { space } from "#src/tokens.stylex.ts";

interface OptionGridProps {
  children: React.ReactNode;
}

/**
 * Wizard option grid — flex-wrap layout shared by every step. Lives outside
 * the step components so the visual rhythm stays consistent without any
 * step having to import another step's styles.
 */
export function OptionGrid({ children }: OptionGridProps) {
  return <div css={styles.grid}>{children}</div>;
}

const styles = stylex.create({
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._2,
    alignItems: "stretch",
  },
});
