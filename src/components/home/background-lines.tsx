import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { border, color, layer } from "#src/tokens.stylex.ts";

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
    zIndex: layer.base,
    pointerEvents: "none",
    opacity: 0.24,
  },
  line: {
    display: "none",
    position: "absolute",
    top: 0,
    bottom: 0,
    width: border.size_1,
    backgroundImage: `linear-gradient(${color.textMuted} 33%, transparent 0%)`,
    backgroundPosition: "right",
    backgroundSize: `${border.size_1} ${border.size_3}`,
    backgroundRepeat: "repeat-y",
  },
  line1: {
    display: "block",
    left: 0,
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
    display: {
      default: "none",
      // Adding an extra breakpoint to avoid overlap with line2 on the first pixel of md screens
      [breakpoints.sm]: "none",
      [breakpoints.md]: "block",
    },
    left: { default: null, [breakpoints.md]: "66.6%", [breakpoints.lg]: "50%" },
  },
  line4: {
    display: {
      default: "none",
      // Adding extra breakpoints to avoid overlap with line3 on the first pixel of lg screens
      [breakpoints.md]: "none",
      [breakpoints.lg]: "block",
    },
    left: { default: null, [breakpoints.lg]: "75%" },
  },
  line5: {
    display: "block",
    left: "100%",
  },
});
