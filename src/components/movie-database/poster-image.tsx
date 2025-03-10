"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/shared/skeleton";
import { useTranslations } from "@/hooks/use-translations";
import { color, font, layer } from "@/tokens.stylex";
import * as tmdbQueries from "@/utils/tmdb-queries";
import type translations from "./poster-image.translations.json";

interface PosterImageProps {
  posterPath: string;
  alt: string;
}

/**
 * A component that renders a poster image with localization and responsive sizing.
 * If the required configuration is unavailable or the image fails to load, a fallback UI is displayed.
 * The component supports lazy loading and generates `srcSet` for responsive image handling.
 */
export function PosterImage({ posterPath, alt }: PosterImageProps) {
  const { t } = useTranslations<typeof translations>("posterImage");
  const { data: config } = useSuspenseQuery(tmdbQueries.configuration);

  const [imgLoaded, setImgLoaded] = useState(false);

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
      {!imgLoaded && <Skeleton fill css={styles.errored} />}
      {/* Disabling no-img-element rule as the images here are from a third party provider and is already 
      optimized */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        css={styles.poster}
        alt={alt}
        src={src}
        srcSet={srcSet}
        sizes="auto,(max-width: 326px) 100vw,(max-width: 485px) 50vw,(max-width: 644px) 33.3vw,(max-width: 767px) 25vw,(max-width: 969px) 33.3vw,(max-width: 1079px) 25vw,(max-width: 1259px) 33.3vw,(max-width: 1571px) 25vw,362px"
        loading="lazy"
        ref={(el) => {
          if (el && el.complete) {
            setImgLoaded(true);
          }
        }}
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
