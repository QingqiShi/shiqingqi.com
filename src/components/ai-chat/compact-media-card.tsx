"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, ratio, shadow } from "#src/tokens.stylex.ts";
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
  if (onClick) {
    return (
      <button
        type="button"
        css={[buttonReset.base, styles.compactCard, styles.interactive]}
        onClick={onClick}
        aria-label={getMediaLabel(media)}
      >
        <MediaPoster media={media} compact decorative />
      </button>
    );
  }

  return (
    <div css={styles.compactCard}>
      <MediaPoster media={media} compact />
    </div>
  );
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
  interactive: {
    transition: {
      default: "transform 0.15s ease, box-shadow 0.15s ease",
      [motionConstants.REDUCED_MOTION]: "box-shadow 0.15s ease",
    },
    transform: {
      default: null,
      ":hover": "scale(1.03)",
      ":active": "scale(0.98)",
    },
    boxShadow: {
      default: "none",
      ":hover": shadow._3,
    },
    outline: {
      default: "none",
      ":focus-visible": `2px solid ${color.controlActive}`,
    },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
});
