"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useScrollFades } from "#src/hooks/use-scroll-fades.ts";
import { color, space } from "#src/tokens.stylex.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { CompactMediaCard } from "./compact-media-card";

interface ToolMediaCardsProps {
  items: ReadonlyArray<MediaListItem>;
}

export function ToolMediaCards({ items }: ToolMediaCardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftFade, showRightFade } = useScrollFades(scrollRef);
  const locale = useLocale();

  if (items.length === 0) return null;

  return (
    <div css={styles.scrollWrapper}>
      <div ref={scrollRef} css={styles.scrollContainer} role="list">
        {items.map((item) => (
          <div key={item.id} css={styles.cardWrapper} role="listitem">
            <CompactMediaCard
              media={item}
              href={
                item.mediaType
                  ? getLocalePath(
                      `/movie-database/${item.mediaType}/${item.id.toString()}`,
                      locale,
                    )
                  : undefined
              }
            />
          </div>
        ))}
      </div>
      <div
        css={[styles.fadeEdge, styles.fadeLeft]}
        style={{ opacity: showLeftFade ? 1 : 0 }}
        aria-hidden="true"
      />
      <div
        css={[styles.fadeEdge, styles.fadeRight]}
        style={{ opacity: showRightFade ? 1 : 0 }}
        aria-hidden="true"
      />
    </div>
  );
}

const styles = stylex.create({
  scrollWrapper: {
    position: "relative",
    marginLeft: `calc(-1 * ${space._3})`,
    marginRight: `calc(-1 * ${space._3})`,
  },
  scrollContainer: {
    display: "flex",
    gap: space._2,
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    scrollbarWidth: "none",
    padding: space._3,
    scrollPaddingLeft: space._3,
    scrollPaddingRight: space._3,
  },
  fadeEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: space._8,
    pointerEvents: "none",
    transition: "opacity 0.2s ease",
  },
  fadeLeft: {
    left: 0,
    backgroundImage: `linear-gradient(to left, rgba(${color.backgroundRaisedChannels}, 0), rgba(${color.backgroundRaisedChannels}, 1))`,
  },
  fadeRight: {
    right: 0,
    backgroundImage: `linear-gradient(to right, rgba(${color.backgroundRaisedChannels}, 0), rgba(${color.backgroundRaisedChannels}, 1))`,
  },
  cardWrapper: {
    flexShrink: 0,
    scrollSnapAlign: "start",
    width: "130px",
    [breakpoints.sm]: {
      width: "140px",
    },
    [breakpoints.md]: {
      width: "155px",
    },
    [breakpoints.lg]: {
      width: "175px",
    },
  },
});
