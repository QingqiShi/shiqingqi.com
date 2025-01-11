import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@/components/shared/skeleton";
import { color, font, layer } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { fetchConfiguration } from "@/utils/tmdbApi";
import translations from "./translations.json";

interface PosterImage {
  locale: SupportedLocale;
  posterPath: string;
  alt: string;
}

/**
 * A component that renders a poster image with localization and responsive sizing.
 * If the required configuration is unavailable or the image fails to load, a fallback UI is displayed.
 * The component supports lazy loading and generates `srcSet` for responsive image handling.
 */
export async function PosterImage({ locale, posterPath, alt }: PosterImage) {
  const { t } = getTranslations(translations, locale);

  const config = await fetchConfiguration();
  if (!config.images?.base_url || !config.images?.poster_sizes) {
    return (
      <div css={[styles.poster, styles.errored]}>
        <div>{alt}</div>
        <div css={styles.errorText}>{t("failedToLoadImage")}</div>
      </div>
    );
  }

  const sizes = config.images.poster_sizes
    .filter((size) => size.startsWith("w"))
    .map((size) => Number(size.replace("w", "")));

  const src = `${config.images?.secure_base_url}w${sizes[sizes.length - 1]}${posterPath}`;
  const srcSet = sizes
    .map(
      (size) =>
        `${config.images?.secure_base_url}w${size}${posterPath} ${size}w`
    )
    .join(", ");

  return (
    <>
      <Skeleton fill css={styles.errored} />
      {/* Disabling no-img-element rule as the images here are from a third party provider and is already 
      optimized */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        css={styles.poster}
        alt={alt}
        src={src}
        srcSet={srcSet}
        // These breakpoints are taken from when the grid snaps from 1 column to 2 and then to 3
        sizes={`auto, (max-width: 526px) 100vw, (max-width: 789px) 50vw, (max-width: 1049px) 33.3vw, 320px`}
        loading="lazy"
      />
    </>
  );
}

const styles = stylex.create({
  poster: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  errored: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: color.backgroundRaised,
    zIndex: layer.background,
  },
  errorText: {
    fontSize: font.size_00,
    color: color.textMuted,
  },
});
