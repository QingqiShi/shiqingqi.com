"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import {
  border,
  color,
  font,
  layer,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Anchor } from "./anchor";
import { cardTokens } from "./card.stylex";

type CardProps = React.ComponentProps<typeof Anchor>;

export function Card({ children, className, style, ...rest }: CardProps) {
  const isExternal = rest.target === "_blank";
  return (
    <Anchor
      {...rest}
      indicateExternal={false}
      className={className}
      style={style}
      css={styles.card}
    >
      {children}
      <div css={styles.detailsBackdrop} />
      <div css={styles.detailsIndicator}>
        <span css={styles.detailsText}>
          {isExternal
            ? t({ en: "Visit", zh: "访问" })
            : t({ en: "Details", zh: "详情" })}
        </span>
        {isExternal ? (
          <ArrowSquareOutIcon aria-hidden="true" />
        ) : (
          <ArrowRightIcon aria-hidden="true" />
        )}
        {isExternal && (
          <span css={styles.srOnly}>
            {t({
              en: "(opens in new tab)",
              zh: "(在新标签页中打开)",
            })}
          </span>
        )}
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
    transition: {
      default:
        "box-shadow 0.2s, transform 0.2s, background-color 0.2s, fill 0.2s",
      [motionConstants.REDUCED_MOTION]:
        "box-shadow 0.2s, background-color 0.2s, fill 0.2s",
    },
    cursor: "pointer",
    position: "relative",
    color: color.textMain,
    boxShadow: { default: "none", ":hover": shadow._5 },
    zIndex: { ":hover": layer.content },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
    transform: {
      default: null,
      ":hover": "scale(1.05) translate3d(0, -0.2rem, 0)",
    },
    backdropFilter: { default: null, ":hover": "blur(2rem)" },
    outline: {
      default: "none",
      ":focus-visible": `2px solid ${color.accent}`,
    },
    // Draw the ring inside the box so `overflow: hidden` doesn't clip it.
    outlineOffset: { default: null, ":focus-visible": "-2px" },

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
        color-mix(in srgb, ${color.bgCanvasFade} 70%, transparent) 0%,
        color-mix(in srgb, ${color.bgCanvasFade} 69.1%, transparent) 4.05%,
        color-mix(in srgb, ${color.bgCanvasFade} 66.6%, transparent) 7.75%,
        color-mix(in srgb, ${color.bgCanvasFade} 62.7%, transparent) 11.2%,
        color-mix(in srgb, ${color.bgCanvasFade} 57.7%, transparent) 14.45%,
        color-mix(in srgb, ${color.bgCanvasFade} 51.9%, transparent) 17.5%,
        color-mix(in srgb, ${color.bgCanvasFade} 45.4%, transparent) 20.5%,
        color-mix(in srgb, ${color.bgCanvasFade} 38.5%, transparent) 23.35%,
        color-mix(in srgb, ${color.bgCanvasFade} 31.5%, transparent) 26.25%,
        color-mix(in srgb, ${color.bgCanvasFade} 24.6%, transparent) 29.15%,
        color-mix(in srgb, ${color.bgCanvasFade} 18.1%, transparent) 32.15%,
        color-mix(in srgb, ${color.bgCanvasFade} 12.3%, transparent) 35.25%,
        color-mix(in srgb, ${color.bgCanvasFade} 7.3%, transparent) 38.55%,
        color-mix(in srgb, ${color.bgCanvasFade} 3.4%, transparent) 42.1%,
        color-mix(in srgb, ${color.bgCanvasFade} 0.9%, transparent) 45.9%,
        transparent 50%
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
    transition: {
      default: "opacity 0.2s, transform 0.2s",
      [motionConstants.REDUCED_MOTION]: "opacity 0.2s",
    },
    zIndex: layer.content,
  },
  detailsText: {
    fontWeight: font.weight_6,
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
