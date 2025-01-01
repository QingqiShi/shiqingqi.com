import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import * as stylex from "@stylexjs/stylex";
import { getTranslations } from "@/app/translations/getTranslations";
import { tokens } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { Anchor } from "./anchor";
import { cardTokens } from "./card.stylex";
import translations from "./translations.json";

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
    fontSize: "1rem",
    borderRadius: "0.5rem",
    textAlign: "left",
    padding: "1rem",
    overflow: "hidden",
    transition:
      "box-shadow 0.2s, transform 0.2s, background-color 0.2s, fill 0.2s",
    cursor: "pointer",
    marginBottom: "1rem",
    position: "relative",
    color: tokens.textMain,
    boxShadow: { default: tokens.shadowNone, ":hover": tokens.shadowRaised },
    backgroundColor: {
      default: "transparent",
      ":hover": tokens.backgroundTranslucent,
    },
    transform: {
      default: null,
      ":hover": "scale(1.05) translate3d(0, -0.2rem, 0)",
    },
    // https://github.com/facebook/stylex/issues/390
    // eslint-disable-next-line @stylexjs/valid-styles
    WebkitBackdropFilter: { default: null, ":hover": "blur(2rem)" },
    backdropFilter: { default: null, ":hover": "blur(2rem)" },

    [cardTokens.imageFilter]: {
      default: "grayscale(100%)",
      ":hover": "grayscale(0%)",
    },
    [cardTokens.detailsIndicatorOpacity]: {
      default: 0,
      ":hover": 1,
    },
    [cardTokens.detailsIndicatorTransform]: {
      default: "translate3d(0, 0.5rem, 0)",
      ":hover": "translate3d(0, 0, 0)",
    },

    // Override svg css variables to be muted when not hovering
    [tokens.citadelLogoFill]: { ":not(:hover)": tokens.textMuted },
    [tokens.spotifyLogoFill]: { ":not(:hover)": tokens.textMuted },
    [tokens.wtcLogoPlusFill]: { ":not(:hover)": tokens.textMuted },
    [tokens.wtcLogoLetterFill]: { ":not(:hover)": tokens.textMuted },
    [tokens.bristolLogoFill]: { ":not(:hover)": tokens.textMuted },
    [tokens.nottinghamLogoFill]: { ":not(:hover)": tokens.textMuted },
  },
  detailsIndicator: {
    pointerEvents: "none",
    position: "absolute",
    top: "0.5rem",
    right: "0.5rem",
    fontSize: "0.6rem",
    display: "flex",
    alignItems: "center",
    transition: "opacity 0.2s, transform 0.2s",
    color: tokens.textMain,
    opacity: cardTokens.detailsIndicatorOpacity,
    transform: cardTokens.detailsIndicatorTransform,
  },
  detailsText: {
    marginRight: "0.2rem",
    fontWeight: 600,
  },
});
