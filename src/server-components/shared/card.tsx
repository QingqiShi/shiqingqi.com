import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import * as stylex from "@stylexjs/stylex";
import { getTranslations } from "@/app/translations/getTranslations";
import { border, color, font, layer, shadow, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import translations from "../translations.json";
import { Anchor } from "./anchor";
import { cardTokens } from "./card.stylex";

interface CardProps extends React.ComponentProps<typeof Anchor> {
  locale: SupportedLocale;
}

export function Card({
  children,
  locale,
  className,
  style,
  ...rest
}: CardProps) {
  const { t } = getTranslations(translations, locale);
  return (
    <Anchor {...rest} className={className} style={style} css={styles.card}>
      {children}
      <div css={styles.detailsBackdrop} />
      <div css={styles.detailsIndicator}>
        <span css={styles.detailsText}>{t("details")}</span>
        <ArrowRight />
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
    fontSize: font.size_1,
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
    // https://github.com/facebook/stylex/issues/390
    // eslint-disable-next-line @stylexjs/valid-styles
    WebkitBackdropFilter: { default: null, ":hover": "blur(2rem)" },
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
    background: `linear-gradient(to top right, transparent 50%, ${color.backgroundMain} 110%)`,
    content: "",
    height: "5rem",
    opacity: cardTokens.detailsIndicatorOpacity,
    pointerEvents: "none",
    position: "absolute",
    right: "-0.5rem",
    top: "-0.5rem",
    transition: "opacity 0.2s",
    width: "10rem",
    zIndex: layer.base,
  },
  detailsIndicator: {
    alignItems: "center",
    color: color.textMain,
    display: "flex",
    fontSize: font.size_00,
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
