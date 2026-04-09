"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { t } from "#src/i18n.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { CompactMediaCard } from "./compact-media-card";
import { HorizontalScrollRow } from "./horizontal-scroll-row";
import { useMediaDetail } from "./media-detail-context";

interface ToolMediaCardsProps {
  items: ReadonlyArray<MediaListItem>;
}

export function ToolMediaCards({ items }: ToolMediaCardsProps) {
  const { setFocusedMedia } = useMediaDetail();

  if (items.length === 0) return null;

  return (
    <HorizontalScrollRow
      ariaLabel={t({ en: "Search results", zh: "搜索结果" })}
    >
      {items.map((item) => {
        const { mediaType } = item;
        return (
          <div
            key={`${item.mediaType ?? "unknown"}-${item.id}`}
            css={styles.cardWrapper}
            role="listitem"
          >
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
  );
}

const styles = stylex.create({
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
