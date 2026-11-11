"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { useTheme } from "@tuja/ui/hooks/use-theme";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border } from "@tuja/ui/tokens.stylex";
import { paneCrop } from "./pane-crop.stylex.ts";
import enDark from "./pane-en-dark.webp";
import enLight from "./pane-en-light.webp";
import zhDark from "./pane-zh-dark.webp";
import zhLight from "./pane-zh-light.webp";

const SHOTS = {
  en: { light: enLight, dark: enDark },
  zh: { light: zhLight, dark: zhDark },
};

/** The Miao pane on a Mac, in the language and theme the page shows. */
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
            en: "The Miao pane on a Mac: a pixel sprout with its Water, Pat and Roast me buttons, this week's quota and its forecast, and the last 30 days in tiles",
            zh: "Mac 上的小苗面板：像素小苗和喂水、摸摸、再嘴一句三个按钮，本周额度和预测，以及近 30 天的数据卡片",
          })}
          css={[corner.radius_3, styles.picture]}
        />
      </picture>
      <Text as="span" look="caption" tone="muted" align="center">
        {t({
          en: "Miao's pane on your Mac",
          zh: "Mac 上的小苗面板",
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
    // A phone and a desktop show only the left half of the pane, where the
    // pet is, so that its words stay large enough to read. A tablet column is
    // wide enough for the whole pane.
    aspectRatio: {
      default: paneCrop.aspectRatio,
      [breakpoints.md]: "auto",
      [breakpoints.lg]: paneCrop.aspectRatio,
    },
    objectFit: "cover",
    objectPosition: "left top",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
});
