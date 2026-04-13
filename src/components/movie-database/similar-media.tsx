import * as stylex from "@stylexjs/stylex";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  getConfiguration,
  getMovieRecommendations,
  getTvShowRecommendations,
} from "#src/_generated/tmdb-server-functions.ts";
import { t } from "#src/i18n.ts";
import { layout, ratio, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getQueryClient } from "#src/utils/get-query-client.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { Skeleton } from "../shared/skeleton";
import { Grid } from "./grid";
import { SimilarMediaList } from "./similar-media-list";

const SKELETON_ITEMS = Array.from({ length: 20 }, (_, i) => ({
  key: `skeleton-${i}`,
  delay: i * 100,
}));

interface SimilarMediaProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  locale: SupportedLocale;
}

export function SimilarMedia({
  mediaId,
  mediaType,
  locale,
}: SimilarMediaProps) {
  const queryClient = getQueryClient();

  // Prefetch configuration
  void queryClient.prefetchQuery({
    ...tmdbQueries.configuration,
    queryFn: async () => getConfiguration(),
  });

  // Prefetch similar media data to prevent SSR errors
  void queryClient.prefetchInfiniteQuery({
    ...tmdbQueries.similarMedia({
      type: mediaType,
      id: mediaId,
      page: 1,
      language: locale,
    }),
    queryFn: async ({ pageParam }) => {
      if (mediaType === "tv") {
        return getTvShowRecommendations({
          series_id: mediaId,
          page: pageParam,
          language: locale,
        });
      } else {
        return getMovieRecommendations({
          movie_id: mediaId,
          page: pageParam,
          language: locale,
        });
      }
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div css={styles.container}>
        <h2 css={styles.heading}>{t({ en: "Similar", zh: "类似" })}</h2>
      </div>
      <Suspense
        fallback={
          <Grid>
            {SKELETON_ITEMS.map((item) => (
              <Skeleton
                key={item.key}
                css={styles.skeleton}
                delay={item.delay}
              />
            ))}
          </Grid>
        }
      >
        <SimilarMediaList
          mediaId={mediaId}
          mediaType={mediaType}
          locale={locale}
          initialPage={1}
          notFoundLabel={t({
            en: "No similar content found",
            zh: "没找到类似内容",
          })}
        />
      </Suspense>
    </HydrationBoundary>
  );
}

const styles = stylex.create({
  container: {
    maxInlineSize: layout.maxInlineSize,
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `env(safe-area-inset-left)`,
    paddingRight: `env(safe-area-inset-right)`,
  },
  heading: {
    paddingInline: space._3,
  },
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
});
