"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { useTheme } from "@tuja/ui/hooks/use-theme";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border } from "@tuja/ui/tokens.stylex";
import enDark from "./pane-en-dark.webp";
import enLight from "./pane-en-light.webp";
import zhDark from "./pane-zh-dark.webp";
import zhLight from "./pane-zh-light.webp";

const SHOTS = {
  en: { light: enLight, dark: enDark },
  zh: { light: zhLight, dark: zhDark },
};

/** The Miao pane beside Claude Code on a Mac, in the language and theme the page shows. */
export function PanelPicture() {
  const [theme] = useTheme();
  const { light, dark } = SHOTS[useLocale()];
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
            en: "The Miao pane beside Claude Code: a pixel sprout, this week's quota and its forecast, the last 30 days in tiles, tokens and merged pull requests by day, and heatmaps of Claude use and GitHub contributions",
            zh: "Claude Code 旁边的小苗面板：像素小苗、本周额度和预测、近 30 天的数据卡片、每日 token 和合并的 PR，以及 Claude 使用和 GitHub 贡献的热力图",
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
