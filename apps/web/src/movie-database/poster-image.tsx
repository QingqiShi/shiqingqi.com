"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { imageCover } from "@tuja/ui/primitives/layout.stylex";
import { layer } from "@tuja/ui/tokens.stylex";
import { configurationQuery } from "#src/movie-database/tmdb/queries/configuration-query.ts";
import { TmdbImage } from "#src/movie-database/tmdb/tmdb-image.tsx";

interface PosterImageProps {
  posterPath: string;
  alt: string;
  // Visible text rendered inside the fallback/error UI. Separate from `alt`
  // so callers can use `alt=""` for decorative images (e.g. inside a labelled
  // card) while still showing the media title to sighted users when the
  // poster is unavailable.
  fallbackLabel?: string;
}

/**
 * A component that renders a poster image with localization and responsive sizing.
 * If the required configuration is unavailable or the image fails to load, a fallback UI is displayed.
 * The component supports lazy loading and generates `srcSet` for responsive image handling.
 */
export function PosterImage({
  posterPath,
  alt,
  fallbackLabel,
}: PosterImageProps) {
  const { data: config } = useSuspenseQuery(configurationQuery());
  const visibleLabel = fallbackLabel ?? alt;

  if (!config.images?.base_url || !config.images.poster_sizes) {
    return (
      <div css={[imageCover.base, flex.center, styles.errored]}>
        <div>{visibleLabel}</div>
        <Text as="div" look="bodySmall" tone="muted">
          {t({ en: "No Poster", zh: "无海报" })}
        </Text>
      </div>
    );
  }

  return (
    <TmdbImage
      baseUrl={config.images.secure_base_url ?? config.images.base_url}
      sizeConfig={config.images.poster_sizes}
      path={posterPath}
      alt={alt}
      sizes="auto,(max-width: 326px) 100vw,(max-width: 485px) 50vw,(max-width: 644px) 33.3vw,(max-width: 767px) 25vw,(max-width: 969px) 33.3vw,(max-width: 1079px) 25vw,(max-width: 1259px) 33.3vw,(max-width: 1571px) 25vw,362px"
      imgCss={imageCover.base}
      skeletonFill
      skeletonShape="square"
      skeletonCss={styles.skeleton}
      errorFallback={
        <div css={[imageCover.base, flex.center, styles.errored]}>
          <div>{visibleLabel}</div>
          <Text as="div" look="bodySmall" tone="muted">
            {t({ en: "No Poster", zh: "无海报" })}
          </Text>
        </div>
      }
      loading="lazy"
    />
  );
}

const styles = stylex.create({
  skeleton: {
    position: "absolute",
    zIndex: layer.background,
  },
  errored: {
    position: "absolute",
    flexDirection: "column",
    backgroundColor: color.card,
    zIndex: layer.background,
  },
});
