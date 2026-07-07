"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { imageCover } from "@tuja/ui/primitives/layout.stylex";
import { color, font, layer } from "@tuja/ui/tokens.stylex";
import { useEffect } from "react";
import { t } from "#src/i18n.ts";
import { reportPosterFallback } from "#src/utils/report-poster-fallback.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { TmdbImage } from "./tmdb-image.tsx";

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
  const { data: config } = useSuspenseQuery(tmdbQueries.configuration);
  const visibleLabel = fallbackLabel ?? alt;
  const configMissing = !config.images?.base_url || !config.images.poster_sizes;

  // Diagnostic: `posterPath` is truthy here (MediaPoster only renders this
  // component when it is), so a missing config is always abnormal. Report it so
  // a device-specific "No Poster" can be attributed to config vs image failure.
  useEffect(() => {
    if (!configMissing) return;
    reportPosterFallback({
      reason: "config-missing",
      configImagesPresent: Boolean(config.images),
      configBaseUrl: Boolean(config.images?.base_url),
      configSecureBaseUrl: Boolean(config.images?.secure_base_url),
      configPosterSizes: config.images?.poster_sizes?.length ?? 0,
    });
  }, [configMissing, config]);

  // Repeat the condition inline (rather than reuse `configMissing`) so
  // TypeScript narrows `config.images` to non-null for the `TmdbImage` props.
  if (!config.images?.base_url || !config.images.poster_sizes) {
    return (
      <div css={[imageCover.base, flex.center, styles.errored]}>
        <div>{visibleLabel}</div>
        <div css={styles.errorText}>{t({ en: "No Poster", zh: "无海报" })}</div>
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
      skeletonCss={[flex.center, styles.errored]}
      errorFallback={
        <div css={[imageCover.base, flex.center, styles.errored]}>
          <div>{visibleLabel}</div>
          <div css={styles.errorText}>
            {t({ en: "No Poster", zh: "无海报" })}
          </div>
        </div>
      }
      loading="lazy"
    />
  );
}

const styles = stylex.create({
  errored: {
    position: "absolute",
    flexDirection: "column",
    backgroundColor: color.bgSurface,
    zIndex: layer.background,
  },
  errorText: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
});
