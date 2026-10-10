import * as stylex from "@stylexjs/stylex";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { ratio, rhythm } from "@tuja/ui/tokens.stylex";
import { Suspense } from "react";
import * as tmdbServerFunctions from "#src/_generated/tmdb-server-functions.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";
import { Grid } from "#src/movie-database/grid.tsx";
import { noop } from "#src/movie-database/noop.ts";
import { getQueryClient } from "#src/movie-database/tmdb/get-query-client.ts";
import { configurationQuery } from "#src/movie-database/tmdb/queries/configuration-query.ts";
import { similarMediaQuery } from "#src/movie-database/tmdb/queries/similar-media-query.ts";
import { SimilarMediaList } from "./similar-media-list";

const SIMILAR_TITLE_ID = "similar-title";

const SKELETON_ITEMS = Array.from({ length: 20 }, (_, i) => ({
  key: `skeleton-${String(i)}`,
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

  queryClient.query(configurationQuery(tmdbServerFunctions)).catch(noop);
  queryClient
    .infiniteQuery(
      similarMediaQuery(
        { type: mediaType, id: mediaId, page: 1, language: locale },
        tmdbServerFunctions,
      ),
    )
    .catch(noop);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <section
        aria-labelledby={SIMILAR_TITLE_ID}
        css={[pageColumn.base, pageColumn.wide]}
      >
        <h2 id={SIMILAR_TITLE_ID} css={styles.heading}>
          {t({ en: "Similar", zh: "类似" })}
        </h2>
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
      </section>
    </HydrationBoundary>
  );
}

const styles = stylex.create({
  heading: {
    marginBlock: 0,
    marginBlockEnd: rhythm.tight,
  },
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
});
