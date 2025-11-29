"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import * as stylex from "@stylexjs/stylex";
import { useTranslations } from "#src/hooks/use-translations.ts";
import {
  border,
  color,
  font,
  layer,
  shadow,
  space,
} from "#src/tokens.stylex.ts";
import { Anchor } from "./anchor";
import { cardTokens } from "./card.stylex";
import type translations from "./card.translations.json";

type CardProps = React.ComponentProps<typeof Anchor>;

export function Card({ children, className, style, ...rest }: CardProps) {
  const { t } = useTranslations<typeof translations>("card");
  return (
    <Anchor {...rest} className={className} style={style} css={styles.card}>
      {children}
      <div css={styles.detailsBackdrop} />
      <div css={styles.detailsIndicator}>
        <span css={styles.detailsText}>{t("details")}</span>
        <ArrowRightIcon />
      </div>
    </Anchor>
  );
}

const styles = stylex.create({
  card: {
    display: "block",
    width: "100%",
    borderStyle: "none",
    textDecoration: "none",
    fontSize: font.uiBody,
    borderRadius: border.radius_2,
    textAlign: "left",
    padding: space._3,
    overflow: "hidden",
    transition:
      "box-shadow 0.2s, transform 0.2s, background-color 0.2s, fill 0.2s",
    cursor: "pointer",
    position: "relative",
    color: color.textMain,
    boxShadow: { default: "none", ":hover": shadow._5 },
    zIndex: { ":hover": layer.content },
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundTranslucent,
    },
    transform: {
      default: null,
      ":hover": "scale(1.05) translate3d(0, -0.2rem, 0)",
    },
    backdropFilter: { default: null, ":hover": "blur(2rem)" },

    [cardTokens.detailsIndicatorOpacity]: {
      default: 0,
      ":hover": 1,
    },
    [cardTokens.detailsIndicatorTransform]: {
      default: "translate3d(0, 0.5rem, 0)",
      ":hover": "translate3d(0, 0, 0)",
    },
    [cardTokens.imageFilter]: {
      default: "grayscale(100%)",
      ":hover": "grayscale(0%)",
    },
  },
  detailsBackdrop: {
    // https://larsenwork.com/easing-gradients/
    backgroundImage: `linear-gradient(
        to bottom left,
        rgba(${color.backgroundMainChannels}, 0.7) 0%,
        rgba(${color.backgroundMainChannels}, 0.691) 4.05%,
        rgba(${color.backgroundMainChannels}, 0.666) 7.75%,
        rgba(${color.backgroundMainChannels}, 0.627) 11.2%,
        rgba(${color.backgroundMainChannels}, 0.577) 14.45%,
        rgba(${color.backgroundMainChannels}, 0.519) 17.5%,
        rgba(${color.backgroundMainChannels}, 0.454) 20.5%,
        rgba(${color.backgroundMainChannels}, 0.385) 23.35%,
        rgba(${color.backgroundMainChannels}, 0.315) 26.25%,
        rgba(${color.backgroundMainChannels}, 0.246) 29.15%,
        rgba(${color.backgroundMainChannels}, 0.181) 32.15%,
        rgba(${color.backgroundMainChannels}, 0.123) 35.25%,
        rgba(${color.backgroundMainChannels}, 0.073) 38.55%,
        rgba(${color.backgroundMainChannels}, 0.034) 42.1%,
        rgba(${color.backgroundMainChannels}, 0.009) 45.9%,
        rgba(${color.backgroundMainChannels}, 0) 50%
      )`,
    content: "",
    position: "absolute",
    top: 0,
    right: 0,
    height: space._10,
    width: space._12,
    opacity: cardTokens.detailsIndicatorOpacity,
    pointerEvents: "none",
    transition: "opacity 0.2s",
  },
  detailsIndicator: {
    alignItems: "center",
    color: color.textMain,
    display: "flex",
    fontSize: font.uiBodySmall,
    gap: space._0,
    opacity: cardTokens.detailsIndicatorOpacity,
    pointerEvents: "none",
    position: "absolute",
    right: space._1,
    top: space._1,
    transform: cardTokens.detailsIndicatorTransform,
    transition: "opacity 0.2s, transform 0.2s",
    zIndex: layer.content,
  },
  detailsText: {
    fontWeight: font.weight_6,
  },
});
