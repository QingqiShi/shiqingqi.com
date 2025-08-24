import * as stylex from "@stylexjs/stylex";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { breakpoints } from "@/breakpoints";
import { ratio, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import { getTranslations } from "@/utils/get-translations";
import { fetchConfiguration } from "@/utils/tmdb-api";
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

  // Only prefetch configuration server-side, not the similar media data
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery({
    ...tmdbQueries.configuration,
    queryFn: async () => fetchConfiguration(),
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
