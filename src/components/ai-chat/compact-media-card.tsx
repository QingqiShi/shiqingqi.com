"use client";

import * as stylex from "@stylexjs/stylex";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, ratio } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaPoster } from "../movie-database/media-poster";

interface CompactMediaCardProps {
  media: MediaListItem;
  onClick?: () => void;
}

export function CompactMediaCard({ media, onClick }: CompactMediaCardProps) {
  const content = <MediaPoster media={media} compact />;

  if (onClick) {
    return (
      <button
        type="button"
        css={[buttonReset.base, styles.compactCard]}
        onClick={onClick}
        aria-label={media.title ?? undefined}
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
