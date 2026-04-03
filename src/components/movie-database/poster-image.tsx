"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { imageCover } from "#src/primitives/layout.stylex.ts";
import { color, font, layer } from "#src/tokens.stylex.ts";
import { buildSrcSet } from "#src/utils/tmdb-image.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";

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
  const { data: config } = useSuspenseQuery(tmdbQueries.configuration);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgErrored, setImgErrored] = useState(false);

  if (!config.images?.base_url || !config.images?.poster_sizes || imgErrored) {
    return (
      <div css={[imageCover.base, flex.center, styles.errored]}>
        <div>{alt}</div>
        <div css={styles.errorText}>{t({ en: "No Poster", zh: "无海报" })}</div>
      </div>
    );
  }

  const { src, srcSet } = buildSrcSet(
    config.images.secure_base_url ?? config.images.base_url,
    config.images.poster_sizes,
    posterPath,
  );

  return (
    <>
      {!imgLoaded && <Skeleton fill css={[flex.center, styles.errored]} />}
      {/* Disabling no-img-element rule as the images here are from a third party provider and is already
      optimized */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        css={imageCover.base}
        alt={alt}
        src={src}
        srcSet={srcSet}
        sizes="auto,(max-width: 326px) 100vw,(max-width: 485px) 50vw,(max-width: 644px) 33.3vw,(max-width: 767px) 25vw,(max-width: 969px) 33.3vw,(max-width: 1079px) 25vw,(max-width: 1259px) 33.3vw,(max-width: 1571px) 25vw,362px"
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgErrored(true)}
        ref={(el) => {
          if (el && el.complete && el.naturalWidth > 0) {
            setImgLoaded(true);
          }
        }}
      />
    </>
  );
}

const styles = stylex.create({
  errored: {
    position: "absolute",
    flexDirection: "column",
    backgroundColor: color.backgroundRaised,
    zIndex: layer.background,
  },
  errorText: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
});
