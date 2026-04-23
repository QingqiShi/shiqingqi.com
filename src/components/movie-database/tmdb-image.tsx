"use client";

import { useState, type ReactNode } from "react";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { buildSrcSet } from "#src/utils/tmdb-image.ts";

interface TmdbImageProps {
  baseUrl: string;
  sizeConfig: ReadonlyArray<string>;
  path: string;
  alt: string;
  sizes: string;
  imgCss?: React.Attributes["css"];
  skeletonCss?: React.Attributes["css"];
  skeletonFill?: boolean;
  errorFallback?: ReactNode;
  loading?: "lazy" | "eager";
}

/**
 * Shared component for rendering TMDB images with loading skeleton and error fallback.
 * Handles loaded/errored state, the ref callback for detecting cached images,
 * and srcSet generation.
 */
export function TmdbImage({
  baseUrl,
  sizeConfig,
  path,
  alt,
  sizes,
  imgCss,
  skeletonCss,
  skeletonFill,
  errorFallback = null,
  loading = "lazy",
}: TmdbImageProps) {
  const { src, srcSet } = buildSrcSet(baseUrl, sizeConfig, path);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Reset on `path` change so a prior success/error verdict doesn't poison
  // the next image. This matters when the same component instance is reused
  // with a new path — e.g. `react-virtuoso`'s default viewport-slot keying
  // in `MediaVirtuosoGrid` cycles posters through a fixed set of slots, so
  // without this reset a single 404 would stick the slot on the error
  // fallback for the rest of the session. Canonical React pattern from the
  // "Resetting state when a prop changes" docs — don't swap for useEffect,
  // that would add an extra render + paint.
  const [prevPath, setPrevPath] = useState(path);
  if (prevPath !== path) {
    setPrevPath(path);
    setLoaded(false);
    setErrored(false);
  }

  if (errored) {
    return <>{errorFallback}</>;
  }

  return (
    <>
      {!loaded && <Skeleton fill={skeletonFill} css={[skeletonCss]} />}
      {/* TMDB images are already optimized by the provider — no need for next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        css={[imgCss]}
        alt={alt}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        loading={loading}
        decoding="async"
        onLoad={() => {
          setLoaded(true);
        }}
        onError={() => {
          setErrored(true);
        }}
        ref={(el) => {
          if (!el?.complete) return;
          // Browsers short-circuit cached responses without firing onLoad/onError,
          // so probe the element directly. naturalWidth > 0 means a decoded image
          // is in memory; naturalWidth === 0 on a complete image means the fetch
          // failed (404, network error, etc.) and the response was cached.
          if (el.naturalWidth > 0) {
            setLoaded(true);
          } else {
            setErrored(true);
          }
        }}
      />
    </>
  );
}
