"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { pageColumn, pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { CompactMediaCard } from "#src/movie-database/compact-media-card.tsx";
import { useMediaDetail } from "#src/movie-database/details/media-detail-provider.tsx";
import { HorizontalScrollRow } from "#src/movie-database/horizontal-scroll-row.tsx";
import type { MediaListItem } from "#src/movie-database/types.ts";

export type MediaRowItem = MediaListItem & {
  /**
   * When provided, the card renders as a Next.js link to this href. When
   * absent, the card opens the in-chat detail overlay via `useMediaDetail`
   * (which requires a `MediaDetailProvider` ancestor).
   */
  href?: string;
};

/**
 * Selects which horizontal inset to use. `"chat"` matches the two-level
 * padding inside `ChatMessageList`; `"standalone"` matches the single-level
 * page padding used by the movie-database landing page.
 */
export type MediaRowInset = "chat" | "standalone";

interface MediaRowProps {
  title: string;
  items: ReadonlyArray<MediaRowItem>;
  inset?: MediaRowInset;
}

export function MediaRow({ title, items, inset = "chat" }: MediaRowProps) {
  if (items.length === 0) return null;

  const isStandalone = inset === "standalone";

  return (
    <section css={stack.tight}>
      <h2
        css={[typeRole.overline, styles.title, isStandalone && pageColumn.base]}
      >
        {title}
      </h2>
      <HorizontalScrollRow
        ariaLabel={title}
        css={isStandalone ? standaloneStyles.root : chatStyles.root}
        contentCss={
          isStandalone
            ? [pageColumn.scroller, standaloneStyles.scrollContainer]
            : chatStyles.scrollContainer
        }
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="listitem"
            css={[styles.cardWrapper, isStandalone && styles.cardWrapperLarge]}
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
 * Horizontal inset from viewport edge to content inside ChatMessageList: the
 * page gutter of the chat's page column, then ChatMessageList's own `space._3`.
 */
const chatInsetStart = `calc(${space._3} + ${pageGutter.inlineStart})`;
const chatInsetEnd = `calc(${space._3} + ${pageGutter.inlineEnd})`;

// Both insets zero the block padding: the room a card needs to grow on hover
// comes from the row's clip margin, which the layout does not pay for.
const chatStyles = stylex.create({
  root: {
    marginInlineStart: `calc(-1 * ${chatInsetStart})`,
    marginInlineEnd: `calc(-1 * ${chatInsetEnd})`,
  },
  scrollContainer: {
    paddingBlock: 0,
    paddingInlineStart: chatInsetStart,
    paddingInlineEnd: chatInsetEnd,
    scrollPaddingInlineStart: chatInsetStart,
    scrollPaddingInlineEnd: chatInsetEnd,
  },
});

// A standalone row spans the page and its cards rest on the page column.
const standaloneStyles = stylex.create({
  root: {
    marginInline: 0,
  },
  scrollContainer: {
    paddingBlock: 0,
  },
});

const styles = stylex.create({
  title: {
    color: color.fgMuted,
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
