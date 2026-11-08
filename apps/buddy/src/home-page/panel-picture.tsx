"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { useTheme } from "@tuja/ui/hooks/use-theme";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border } from "@tuja/ui/tokens.stylex";
import dark from "./screenshot-dark.webp";
import light from "./screenshot-light.webp";

/** The Miao pane beside Claude Code on a Mac, in the theme the page shows. */
export function PanelPicture() {
  const [theme] = useTheme();
  // Until hydration the theme is "system", so the browser picks by its own
  // scheme, as the page's colours do; a stored theme then pins the picture.
  const darkMedia =
    theme === "dark"
      ? "all"
      : theme === "light"
        ? "not all"
        : "(prefers-color-scheme: dark)";

  return (
    <figure css={[stack.tight, styles.figure]}>
      <picture css={styles.frame}>
        <source
          media={darkMedia}
          srcSet={dark.src}
          width={dark.width}
          height={dark.height}
        />
        <img
          src={light.src}
          width={light.width}
          height={light.height}
          alt={t({
            en: "The Miao pane beside Claude Code: a pixel sprout, this week's quota and its forecast, tokens by day, merged pull requests and the GitHub heatmap",
            zh: "Claude Code 旁边的小苗面板：像素小苗、本周额度和预测、每日 token、合并的 PR 和 GitHub 热力图",
          })}
          css={[corner.radius_3, styles.picture]}
        />
      </picture>
      <Text as="span" look="caption" tone="muted" css={styles.caption}>
        {t({
          en: "The Miao pane beside Claude Code on a Mac",
          zh: "Mac 上，Claude Code 旁边的小苗面板",
        })}
      </Text>
    </figure>
  );
}

const styles = stylex.create({
  figure: {
    margin: 0,
  },
  frame: {
    display: "block",
  },
  picture: {
    display: "block",
    inlineSize: "100%",
    blockSize: "auto",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  caption: {
    textAlign: "center",
  },
});
