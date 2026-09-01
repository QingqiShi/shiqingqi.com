"use client";

import { Skeleton } from "@tuja/ui/components/skeleton";
import type { StyleProp } from "@tuja/ui/style-prop";
import { useState, type ReactNode } from "react";
import { buildTmdbSrcSet } from "#src/utils/build-tmdb-src-set.ts";

interface TmdbImageProps {
  baseUrl: string;
  sizeConfig: ReadonlyArray<string>;
  path: string;
  alt: string;
  sizes: string;
  imgCss?: StyleProp;
  skeletonCss?: StyleProp;
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
  const { src, srcSet } = buildTmdbSrcSet(baseUrl, sizeConfig, path);
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
          // Adopt the decoded state of images the browser served from cache
          // without firing onLoad — naturalWidth > 0 means a decoded image is
          // in memory. Only ever conclude *success* here; leave *failure* to
          // onError. iOS Safari reports `complete === true` with
          // `naturalWidth === 0` for loading="lazy" images that haven't loaded
          // yet (deferred, off-screen) — Chrome reports `complete === false`.
          // Treating that as a failed fetch flipped every poster to the "No
          // Poster" fallback on iOS and removed the <img>, so it never loaded.
          if (el?.complete && el.naturalWidth > 0) {
            setLoaded(true);
          }
        }}
      />
    </>
  );
}
