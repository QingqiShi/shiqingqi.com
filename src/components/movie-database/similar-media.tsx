import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  getConfiguration,
  getMovieRecommendations,
  getTvShowRecommendations,
} from "@/_generated/tmdb-server-functions";
import type { SupportedLocale } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import { getTranslations } from "@/utils/get-translations";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { Skeleton } from "../shared/skeleton";
import { Grid } from "./grid";
import { SimilarMediaList } from "./similar-media-list";
import translations from "./translations.json";

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
  const { t } = getTranslations(translations, locale);

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
      <div className="max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)] my-0 mx-auto py-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <h2 className="px-3">{t("similar")}</h2>
      </div>
      <Suspense
        fallback={
          <Grid>
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-[2/3] w-full"
                delay={i * 100}
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
          notFoundLabel={t("notFound")}
        />
      </Suspense>
    </HydrationBoundary>
  );
}
