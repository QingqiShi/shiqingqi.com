import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";

interface OptionGridProps {
  children: React.ReactNode;
  /** Optional ARIA role — pass `"radiogroup"` for single-select groups. */
  role?: "radiogroup";
  "aria-labelledby"?: string;
  "aria-label"?: string;
}

/**
 * Wizard option grid — flex-wrap layout shared by every step. Lives outside
 * the step components so the visual rhythm stays consistent without any
 * step having to import another step's styles.
 */
export function OptionGrid({
  children,
  role,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
}: OptionGridProps) {
  return (
    <div
      css={styles.grid}
      role={role}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._2,
    alignItems: "stretch",
  },
});
