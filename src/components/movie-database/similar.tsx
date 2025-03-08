import * as stylex from "@stylexjs/stylex";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { breakpoints } from "@/breakpoints";
import { ratio, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import { getTranslations } from "@/utils/get-translations";
import { fetchSimilarMovies } from "@/utils/tmdb-api";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { Skeleton } from "../shared/skeleton";
import { Grid } from "./grid";
import { SimilarMovieList } from "./similar-movie-list";
import translations from "./translations.json";

interface SimilarProps {
  movieId: string;
  locale: SupportedLocale;
}

export function Similar({ movieId, locale }: SimilarProps) {
  const { t } = getTranslations(translations, locale);

  // Fetch config and initial page
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(tmdbQueries.configuration);
  const queryParams = { movieId, page: 1, language: locale };
  void queryClient.prefetchInfiniteQuery({
    ...tmdbQueries.similarMovies(queryParams),
    queryFn: async () => fetchSimilarMovies(queryParams),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div css={styles.container}>
        <h2 css={styles.heading}>{t("similar")}</h2>
      </div>
      <Suspense
        fallback={
          <Grid>
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} css={styles.skeleton} delay={i * 100} />
            ))}
          </Grid>
        }
      >
        <SimilarMovieList
          movieId={movieId}
          locale={locale}
          initialPage={1}
          notFoundLabel={t("notFound")}
        />
      </Suspense>
    </HydrationBoundary>
  );
}

const styles = stylex.create({
  container: {
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
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
