"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { memo, useDeferredValue, useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { breakpoints } from "@/breakpoints";
import { Grid } from "@/components/movie-database/grid";
import { useMediaFilters } from "@/hooks/use-media-filters";
import { color, ratio, space } from "@/tokens.stylex";
import { useTranslationContext } from "@/utils/translation-context";
import { Skeleton } from "../shared/skeleton";

interface MediaListProps<T> {
  initialPage: number;
  notFoundLabel: string;
  queryOptions: (params: Record<string, unknown>) => unknown;
  renderItem: (item: T, allowFollow: boolean) => React.ReactNode;
}

export function MediaList<T extends { id: number }>({
  initialPage,
  notFoundLabel,
  queryOptions,
  renderItem,
}: MediaListProps<T>) {
  const { locale } = useTranslationContext();
  const { genres, genreFilterType, sort } = useMediaFilters();

  // Use deferred value to prevent re-suspending when the genre changes
  const deferredGenre = useDeferredValue(genres);
  const deferredGenreFilterType = useDeferredValue(genreFilterType);
  const deferredSort = useDeferredValue(sort);

  const tmdbQueryOptions = queryOptions({
    page: initialPage,
    language: locale,
    with_genres:
      [...deferredGenre].join(deferredGenreFilterType === "any" ? "|" : ",") ||
      undefined,
    sort_by: deferredSort !== "popularity.desc" ? deferredSort : undefined,
  });

  const { data, fetchNextPage, hasNextPage, isFetching } =
    useSuspenseInfiniteQuery(
      tmdbQueryOptions as Parameters<typeof useSuspenseInfiniteQuery>[0],
    );

  const items = data as T[];

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
    return <div css={styles.notFound}>🙉 {notFoundLabel}</div>;
  }

  return (
    <VirtuosoGrid
      key={JSON.stringify(tmdbQueryOptions)}
      data={items}
      components={gridComponents}
      itemContent={(index) => (
        <ItemContent
          index={index}
          items={items}
          renderItem={
            renderItem as (
              item: unknown,
              allowFollow: boolean,
            ) => React.ReactNode
          }
        />
      )}
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

const ItemContent = memo(function ItemContent<T>({
  index,
  items,
  renderItem,
}: {
  index: number;
  items: T[];
  renderItem: (item: T, allowFollow: boolean) => React.ReactNode;
}) {
  return items[index] ? (
    renderItem(items[index], index < 20)
  ) : (
    <Skeleton css={styles.skeleton} delay={index * 100} />
  );
});

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
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    marginBlock: 0,
    marginInline: "auto",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    color: color.textMuted,
    textAlign: "center",
  },
});
