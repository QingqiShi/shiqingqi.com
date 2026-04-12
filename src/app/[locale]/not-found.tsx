import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

export const metadata: Metadata = {
  title: "404 | Qingqi Shi",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div css={styles.container} role="alert">
      <h1 css={styles.heading}>404</h1>
      <p css={styles.description}>
        {t({ en: "Page not found 😢", zh: "页面未找到 😢" })}
      </p>
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60dvh",
    textAlign: "center",
    padding: space._4,
  },
  heading: {
    fontSize: font.vpHeading1,
    fontWeight: font.weight_7,
    margin: 0,
  },
  description: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: `${space._2} 0 0`,
  },
});
