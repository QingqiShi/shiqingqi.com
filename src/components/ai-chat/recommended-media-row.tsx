"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { CompactMediaCard } from "./compact-media-card";
import { HorizontalScrollRow } from "./horizontal-scroll-row";
import { useMediaDetail } from "./media-detail-context";

type RowInset = "chat" | "standalone";

export type RecommendedMediaRowItem = MediaListItem & {
  /**
   * When provided, the card renders as a Next.js link to this href. When
   * absent, the card opens the in-chat detail overlay via `useMediaDetail`
   * (which requires a `MediaDetailProvider` ancestor).
   */
  href?: string;
};

interface RecommendedMediaRowProps {
  title: string;
  items: ReadonlyArray<RecommendedMediaRowItem>;
  /**
   * Selects which horizontal inset to use. `"chat"` (default) matches the
   * two-level padding inside `ChatMessageList`; `"standalone"` matches the
   * single-level page padding used by the movie-database landing page.
   */
  inset?: RowInset;
}

export function RecommendedMediaRow({
  title,
  items,
  inset = "chat",
}: RecommendedMediaRowProps) {
  if (items.length === 0) return null;

  const rowStyles = inset === "standalone" ? standaloneStyles : chatStyles;

  return (
    <section css={[flex.col, styles.section]}>
      <h2 css={styles.title}>{title}</h2>
      <HorizontalScrollRow
        ariaLabel={title}
        wrapperCss={rowStyles.scrollWrapper}
        containerCss={rowStyles.scrollContainer}
        fadeLeftCss={rowStyles.fadeLeft}
        fadeRightCss={rowStyles.fadeRight}
        scrollButtonLeftCss={rowStyles.scrollButtonLeft}
        scrollButtonRightCss={rowStyles.scrollButtonRight}
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="listitem"
            css={[
              styles.cardWrapper,
              inset === "standalone" && styles.cardWrapperLarge,
            ]}
          >
            {item.href ? (
              <CompactMediaCard media={item} href={item.href} />
            ) : (
              <FocusCard item={item} />
            )}
          </div>
        ))}
      </HorizontalScrollRow>
    </section>
  );
}

function FocusCard({ item }: { item: MediaListItem }) {
  const { setFocusedMedia } = useMediaDetail();
  const { mediaType } = item;
  return (
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
  );
}

/**
 * Horizontal inset from viewport edge to content inside ChatMessageList.
 * Padding chain: layout (space._3 + safe-area) + ChatMessageList (space._3).
 * See also: ai-chat-view.tsx inputArea which uses the same offsets.
 */
const chatInsetLeft = `calc(${space._3} + ${space._3} + env(safe-area-inset-left, 0px))`;
const chatInsetRight = `calc(${space._3} + ${space._3} + env(safe-area-inset-right, 0px))`;

/**
 * Single-level page padding used on the movie-database landing page, matching
 * `HeroSection` so cards visually align with the hero heading and chat input.
 */
const standaloneInsetLeft = `calc(${space._3} + env(safe-area-inset-left, 0px))`;
const standaloneInsetRight = `calc(${space._3} + env(safe-area-inset-right, 0px))`;

const chatStyles = stylex.create({
  scrollWrapper: {
    marginLeft: `calc(-1 * ${chatInsetLeft})`,
    marginRight: `calc(-1 * ${chatInsetRight})`,
  },
  scrollContainer: {
    paddingTop: 0,
    paddingBottom: space._1,
    paddingLeft: chatInsetLeft,
    paddingRight: chatInsetRight,
    scrollPaddingLeft: chatInsetLeft,
    scrollPaddingRight: chatInsetRight,
  },
  fadeLeft: {
    backgroundImage: `linear-gradient(to left, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  fadeRight: {
    backgroundImage: `linear-gradient(to right, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  scrollButtonLeft: {
    left: chatInsetLeft,
  },
  scrollButtonRight: {
    right: chatInsetRight,
  },
});

const standaloneStyles = stylex.create({
  scrollWrapper: {
    marginLeft: `calc(-1 * ${standaloneInsetLeft})`,
    marginRight: `calc(-1 * ${standaloneInsetRight})`,
  },
  scrollContainer: {
    paddingTop: 0,
    paddingBottom: space._1,
    paddingLeft: standaloneInsetLeft,
    paddingRight: standaloneInsetRight,
    scrollPaddingLeft: standaloneInsetLeft,
    scrollPaddingRight: standaloneInsetRight,
  },
  fadeLeft: {
    backgroundImage: `linear-gradient(to left, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  fadeRight: {
    backgroundImage: `linear-gradient(to right, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  scrollButtonLeft: {
    left: standaloneInsetLeft,
  },
  scrollButtonRight: {
    right: standaloneInsetRight,
  },
});

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
  cardWrapperLarge: {
    width: "150px",
    [breakpoints.sm]: {
      width: "175px",
    },
    [breakpoints.md]: {
      width: "210px",
    },
    [breakpoints.lg]: {
      width: "240px",
    },
  },
});
