import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import {
  getTrendingMovies,
  getTrendingTvShows,
} from "#src/_generated/tmdb-server-functions.ts";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { RecommendedMediaRowSkeleton } from "#src/components/ai-chat/recommended-media-row-skeleton.tsx";
import {
  RecommendedMediaRow,
  type RecommendedMediaRowItem,
} from "#src/components/ai-chat/recommended-media-row.tsx";
import { t } from "#src/i18n.ts";
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";

const ITEMS_PER_ROW = 14;

interface CuratedMediaRowsProps {
  locale: SupportedLocale;
}

export function CuratedMediaRows({ locale }: CuratedMediaRowsProps) {
  return (
    <section
      aria-label={t({ en: "Curated picks", zh: "精选推荐" })}
      css={styles.container}
    >
      <Suspense fallback={<RecommendedMediaRowSkeleton inset="standalone" />}>
        <TrendingMoviesRow locale={locale} />
      </Suspense>
      <Suspense fallback={<RecommendedMediaRowSkeleton inset="standalone" />}>
        <TrendingTvShowsRow locale={locale} />
      </Suspense>
    </section>
  );
}

function buildMovieHref(locale: SupportedLocale, id: number): string {
  return getLocalePath(`/movie-database/movie/${id.toString()}`, locale);
}

function buildTvHref(locale: SupportedLocale, id: number): string {
  return getLocalePath(`/movie-database/tv/${id.toString()}`, locale);
}

async function TrendingMoviesRow({ locale }: { locale: SupportedLocale }) {
  const response = await getTrendingMovies({
    time_window: "week",
    language: locale,
  }).catch((error: unknown) => {
    console.error("Failed to fetch trending movies:", error);
    return null;
  });
  if (!response) return null;

  const items: RecommendedMediaRowItem[] = (response.results ?? [])
    .filter((movie) => movie.title)
    .slice(0, ITEMS_PER_ROW)
    .map((movie) => ({
      id: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      mediaType: "movie" as const,
      href: buildMovieHref(locale, movie.id),
    }));

  return (
    <RecommendedMediaRow
      title={t({ en: "Trending Movies This Week", zh: "本周热门电影" })}
      items={items}
      inset="standalone"
    />
  );
}

async function TrendingTvShowsRow({ locale }: { locale: SupportedLocale }) {
  const response = await getTrendingTvShows({
    time_window: "week",
    language: locale,
  }).catch((error: unknown) => {
    console.error("Failed to fetch trending TV shows:", error);
    return null;
  });
  if (!response) return null;

  const items: RecommendedMediaRowItem[] = (response.results ?? [])
    .filter((show) => show.name)
    .slice(0, ITEMS_PER_ROW)
    .map((show) => ({
      id: show.id,
      title: show.name,
      posterPath: show.poster_path,
      mediaType: "tv" as const,
      href: buildTvHref(locale, show.id),
    }));

  return (
    <RecommendedMediaRow
      title={t({ en: "Trending TV Shows This Week", zh: "本周热门剧集" })}
      items={items}
      inset="standalone"
    />
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left, 0px))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right, 0px))`,
    paddingBlockEnd: space._5,
    [breakpoints.md]: {
      gap: space._6,
      paddingBlockEnd: space._6,
    },
  },
});
