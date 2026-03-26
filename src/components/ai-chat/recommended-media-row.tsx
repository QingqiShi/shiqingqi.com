"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useScrollFades } from "#src/hooks/use-scroll-fades.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { CompactMediaCard } from "./compact-media-card";

interface RecommendedMediaRowProps {
  title: string;
  items: ReadonlyArray<MediaListItem>;
}

export function RecommendedMediaRow({
  title,
  items,
}: RecommendedMediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftFade, showRightFade } = useScrollFades(scrollRef);
  const locale = useLocale();

  if (items.length === 0) return null;

  return (
    <section css={styles.section}>
      <h2 css={styles.title}>{title}</h2>
      <div css={styles.scrollWrapper}>
        <div
          ref={scrollRef}
          css={styles.scrollContainer}
          role="region"
          aria-label={title}
          tabIndex={0}
        >
          {items.map((item) => (
            <div key={item.id} css={styles.cardWrapper}>
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
    </section>
  );
}

/**
 * Horizontal inset from viewport edge to content inside ChatMessageList.
 * Padding chain: layout (space._3 + safe-area) + ChatMessageList (space._3).
 * See also: ai-chat-view.tsx inputArea which uses the same offsets.
 */
const contentInsetLeft = `calc(${space._3} + ${space._3} + env(safe-area-inset-left, 0px))`;
const contentInsetRight = `calc(${space._3} + ${space._3} + env(safe-area-inset-right, 0px))`;

const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  title: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: 0,
  },
  scrollWrapper: {
    position: "relative",
    marginLeft: `calc(-1 * ${contentInsetLeft})`,
    marginRight: `calc(-1 * ${contentInsetRight})`,
  },
  scrollContainer: {
    display: "flex",
    gap: space._2,
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    scrollbarWidth: "none",
    paddingBottom: space._1,
    paddingLeft: contentInsetLeft,
    paddingRight: contentInsetRight,
    scrollPaddingLeft: contentInsetLeft,
    scrollPaddingRight: contentInsetRight,
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
    backgroundImage: `linear-gradient(to left, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  fadeRight: {
    right: 0,
    backgroundImage: `linear-gradient(to right, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
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
