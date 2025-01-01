import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { tokens } from "@/tokens.stylex";

export function BackgroundLines() {
  return (
    <div css={styles.linesContainer} role="presentation">
      <div css={[styles.line, styles.line1]} role="presentation" />
      <div css={[styles.line, styles.line2]} role="presentation" />
      <div css={[styles.line, styles.line3]} role="presentation" />
      <div css={[styles.line, styles.line4]} role="presentation" />
      <div css={[styles.line, styles.line5]} role="presentation" />
    </div>
  );
}

const styles = stylex.create({
  linesContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
    pointerEvents: "none",
    opacity: 0.24,
  },
  line: {
    display: "none",
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "0.0625rem",
    backgroundImage: `linear-gradient(${tokens.textMuted} 33%, rgba(255, 255, 255, 0) 0%)`,
    backgroundPosition: "right",
    backgroundSize: "0.0625rem 0.3125rem",
    backgroundRepeat: "repeat-y",
  },
  line1: {
    display: "block",
    left: "0",
  },
  line2: {
    display: { default: "none", [breakpoints.sm]: "block" },
    left: {
      default: null,
      [breakpoints.sm]: "50%",
      [breakpoints.md]: "33.3%",
      [breakpoints.lg]: "25%",
    },
  },
  line3: {
    display: { default: "none", [breakpoints.md]: "block" },
    left: { default: null, [breakpoints.md]: "66.6%", [breakpoints.lg]: "50%" },
  },
  line4: {
    display: { default: "none", [breakpoints.lg]: "block" },
    left: { default: null, [breakpoints.lg]: "75%" },
  },
  line5: {
    display: "block",
    left: "100%",
  },
});
