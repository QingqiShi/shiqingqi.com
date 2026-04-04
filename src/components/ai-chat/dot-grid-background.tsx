import * as stylex from "@stylexjs/stylex";
import { color, layer } from "#src/tokens.stylex.ts";

export function DotGridBackground() {
  return <div css={styles.background} role="presentation" />;
}

const styles = stylex.create({
  background: {
    position: "fixed",
    inset: 0,
    zIndex: layer.background,
    pointerEvents: "none",
    backgroundImage: `radial-gradient(circle, ${color.textMuted} 1px, transparent 1px), radial-gradient(ellipse at 80% 20%, ${color.controlActive} 0%, transparent 70%)`,
    backgroundSize: "24px 24px, 100% 100%",
    backgroundRepeat: "repeat, no-repeat",
    opacity: 0.12,
  },
});
