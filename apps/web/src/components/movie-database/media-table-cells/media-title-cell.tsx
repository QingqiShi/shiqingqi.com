"use client";

import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { color, font, ratio, space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "../../shared/anchor";
import { useMediaTable } from "../media-table-context";
import type { MediaCellParams } from "../media-table-spec";
import { TmdbImage } from "../tmdb-image";

/** Stands in for a poster that is missing or failed to load. */
function PosterFallback() {
  return (
    <span css={styles.posterEmpty} aria-hidden="true">
      🎬
    </span>
  );
}

export function MediaTitleCell({ api, row }: MediaCellParams) {
  const { posterBaseUrl, posterSizes, hrefFor } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const media = row.data;

  const year = media.releaseDate?.slice(0, 4);
  const original =
    media.originalTitle && media.originalTitle !== media.title
      ? media.originalTitle
      : null;
  const meta = [year, original].filter(Boolean).join(" · ");

  return (
    <div css={styles.titleCell}>
      <span css={[corner.radius_1, styles.poster]}>
        {posterBaseUrl && posterSizes && media.posterPath ? (
          // `alt=""` — the title is right next to it as a real link, so
          // announcing the poster would just repeat it.
          <TmdbImage
            baseUrl={posterBaseUrl}
            sizeConfig={posterSizes}
            path={media.posterPath}
            alt=""
            // The thumbnail is a fixed 3.5rem tall at poster aspect ratio, so
            // roughly 37px wide; `srcSet` then picks w92 on a 2x display.
            sizes="37px"
            imgCss={styles.posterImage}
            skeletonFill
            errorFallback={<PosterFallback />}
          />
        ) : (
          <PosterFallback />
        )}
      </span>
      <span css={styles.titleText}>
        <Anchor
          href={hrefFor(media)}
          prefetch={false}
          rel="nofollow"
          css={[styles.titleLink, truncate.base]}
        >
          {media.title}
        </Anchor>
        {meta && <span css={[styles.titleMeta, truncate.base]}>{meta}</span>}
      </span>
    </div>
  );
}

const styles = stylex.create({
  titleCell: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    inlineSize: "100%",
    minInlineSize: 0,
    blockSize: "100%",
  },
  poster: {
    position: "relative",
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    blockSize: "3.5rem",
    aspectRatio: ratio.poster,
    overflow: "hidden",
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `0 0 0 1px ${color.neutralBorder}`,
  },
  posterImage: {
    inlineSize: "100%",
    blockSize: "100%",
    objectFit: "cover",
  },
  posterEmpty: {
    fontSize: font.uiBodySmall,
    opacity: 0.5,
  },
  titleText: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    minInlineSize: 0,
  },
  titleLink: {
    color: color.textMain,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_2,
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
  },
  titleMeta: {
    color: color.textSubtle,
    fontSize: font.uiOverline,
    lineHeight: font.lineHeight_2,
  },
});
