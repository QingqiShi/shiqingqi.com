"use client";

import * as stylex from "@stylexjs/stylex";
import { border, ratio } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaPoster } from "../movie-database/media-poster";
import { Anchor } from "../shared/anchor";

interface CompactMediaCardProps {
  media: MediaListItem;
  href?: string;
}

export function CompactMediaCard({ media, href }: CompactMediaCardProps) {
  const content = <MediaPoster media={media} compact />;

  if (href) {
    return (
      <Anchor href={href} css={styles.compactCard}>
        {content}
      </Anchor>
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
    textDecoration: "none",
    color: "inherit",
  },
});
