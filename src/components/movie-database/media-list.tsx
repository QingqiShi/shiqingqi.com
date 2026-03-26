"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useDeferredValue, useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { color, ratio, space } from "#src/tokens.stylex.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { Skeleton } from "../shared/skeleton";
import { MediaCard } from "./media-card";

interface MediaListProps {
  initialPage: number;
}

export function MediaList({ initialPage }: MediaListProps) {
  const locale = useLocale();
  const { genres, genreFilterType, sort, mediaType } = useMediaFilters();

  // Use deferred value to prevent re-suspending when the genre changes
  const deferredGenre = useDeferredValue(genres);
  const deferredGenreFilterType = useDeferredValue(genreFilterType);
  const deferredSort = useDeferredValue(sort);
  const deferredMediaType = useDeferredValue(mediaType);

  const tmdbQueryOptions = tmdbQueries.mediaList({
    type: deferredMediaType,
    page: initialPage,
    language: locale,
    with_genres:
      [...deferredGenre].join(deferredGenreFilterType === "any" ? "|" : ",") ||
      undefined,
    sort_by: deferredSort !== "popularity.desc" ? deferredSort : undefined,
  });

  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(tmdbQueryOptions);

  // Get viewport height, used for infinite scroll padding
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 0,
  );
  useLayoutEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [initialCount] = useState(items.length);

  if (!items.length) {
    const notFoundLabel =
      mediaType === "tv"
        ? t({
            en: "No TV shows found that match the criteria, please update the filters",
            zh: "没有找到符合条件的电视剧，请更新筛选条件",
          })
        : t({
            en: "No movies found that match the criteria, please update the filters",
            zh: "没有找到符合条件的电影，请更新筛选条件",
          });
    return <div css={styles.notFound}>🙉 {notFoundLabel}</div>;
  }

  return (
    <VirtuosoGrid
      key={JSON.stringify(tmdbQueryOptions)}
      data={items}
      components={gridComponents}
      itemContent={(index) => <ItemContent index={index} items={items} />}
      endReached={() => {
        if (hasNextPage && !isFetching) {
          void fetchNextPage();
        }
      }}
      increaseViewportBy={height}
      initialItemCount={initialCount}
      useWindowScroll
    />
  );
}

function ItemContent({
  index,
  items,
}: {
  index: number;
  items: MediaListItem[];
}) {
  const item = items[index];

  if (!item) {
    return <Skeleton css={styles.skeleton} delay={index * 100} />;
  }

  const allowFollow = index < 20;

  return <MediaCard media={item} allowFollow={allowFollow} />;
}

const gridComponents = {
  List: Grid,
};

const styles = stylex.create({
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
    overflow: "hidden",
  },
  notFound: {
    maxInlineSize: "1140px",
    marginBlock: 0,
    marginInline: "auto",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    color: color.textMuted,
    textAlign: "center",
  },
});
