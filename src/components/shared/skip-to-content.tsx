import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { border, color, font, layer, space } from "#src/tokens.stylex.ts";

export function SkipToContent() {
  return (
    <a href="#main-content" css={styles.link}>
      {t({ en: "Skip to content", zh: "跳转到内容" })}
    </a>
  );
}

const styles = stylex.create({
  link: {
    position: "fixed",
    top: space._2,
    left: space._2,
    zIndex: layer.tooltip,
    padding: `${space._1} ${space._3}`,
    backgroundColor: color.controlActive,
    color: color.textOnActive,
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    borderRadius: border.radius_2,
    textDecoration: "none",
    transform: {
      default: "translateY(-200%)",
      ":focus-visible": "translateY(0)",
    },
  },
});
