"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { CompactMediaCard } from "./compact-media-card";
import { HorizontalScrollRow } from "./horizontal-scroll-row";
import { useMediaDetail } from "./media-detail-context";

interface RecommendedMediaRowProps {
  title: string;
  items: ReadonlyArray<MediaListItem>;
}

export function RecommendedMediaRow({
  title,
  items,
}: RecommendedMediaRowProps) {
  const { setFocusedMedia } = useMediaDetail();

  if (items.length === 0) return null;

  return (
    <section css={[flex.col, styles.section]}>
      <h2 css={styles.title}>{title}</h2>
      <HorizontalScrollRow
        ariaLabel={title}
        role="region"
        wrapperCss={styles.scrollWrapper}
        containerCss={styles.scrollContainer}
        fadeLeftCss={styles.fadeLeft}
        fadeRightCss={styles.fadeRight}
        scrollButtonLeftCss={styles.scrollButtonLeft}
        scrollButtonRightCss={styles.scrollButtonRight}
      >
        {items.map((item) => {
          const { mediaType } = item;
          return (
            <div key={item.id} css={styles.cardWrapper}>
              <CompactMediaCard
                media={item}
                onClick={
                  mediaType
                    ? () => {
                        setFocusedMedia({
                          id: item.id,
                          mediaType,
                          title: item.title,
                          posterPath: item.posterPath,
                        });
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </HorizontalScrollRow>
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
    marginLeft: `calc(-1 * ${contentInsetLeft})`,
    marginRight: `calc(-1 * ${contentInsetRight})`,
  },
  scrollContainer: {
    paddingTop: 0,
    paddingBottom: space._1,
    paddingLeft: contentInsetLeft,
    paddingRight: contentInsetRight,
    scrollPaddingLeft: contentInsetLeft,
    scrollPaddingRight: contentInsetRight,
  },
  fadeLeft: {
    backgroundImage: `linear-gradient(to left, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  fadeRight: {
    backgroundImage: `linear-gradient(to right, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  scrollButtonLeft: {
    left: contentInsetLeft,
  },
  scrollButtonRight: {
    right: contentInsetRight,
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
