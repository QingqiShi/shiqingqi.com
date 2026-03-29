"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, ratio } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaPoster } from "../movie-database/media-poster";

interface CompactMediaCardProps {
  media: MediaListItem;
  onClick?: () => void;
}

function getMediaLabel(media: MediaListItem): string {
  if (media.title) return media.title;
  if (media.mediaType === "movie") return t({ en: "Movie", zh: "电影" });
  if (media.mediaType === "tv") return t({ en: "TV show", zh: "电视剧" });
  return t({ en: "Media", zh: "媒体" });
}

export function CompactMediaCard({ media, onClick }: CompactMediaCardProps) {
  const content = <MediaPoster media={media} compact />;

  if (onClick) {
    return (
      <button
        type="button"
        css={[buttonReset.base, styles.compactCard]}
        onClick={onClick}
        aria-label={getMediaLabel(media)}
      >
        {content}
      </button>
    );
  }

  return <div css={styles.compactCard}>{content}</div>;
}

const styles = stylex.create({
  compactCard: {
    position: "relative",
    aspectRatio: ratio.poster,
    width: "100%",
    borderRadius: border.radius_2,
    overflow: "hidden",
    display: "block",
    color: "inherit",
  },
});
