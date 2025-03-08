import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { breakpoints } from "@/breakpoints";
import { BackdropImage } from "@/components/movie-database/backdrop-image";
import { Similar } from "@/components/movie-database/similar";
import { Trailer } from "@/components/movie-database/trailer";
import { Skeleton } from "@/components/shared/skeleton";
import { skeletonTokens } from "@/components/shared/skeleton.stylex";
import { border, color, controlSize, font, space } from "@/tokens.stylex";
import { getTranslations } from "@/utils/get-translations";
import { fetchMovieDetails } from "@/utils/tmdb-api";
import translations from "./translations.json";
import type { PageProps } from "./types";

export default async function Page({ params }: PageProps) {
  const { id, locale } = await params;
  const { t } = getTranslations(translations, locale);

  const [movie] = await Promise.all([
    fetchMovieDetails(id, { language: locale }),
  ]);
  const hours = Math.floor(movie.runtime / 60);
  const minutes = movie.runtime % 60;

  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <>
      <div css={styles.container}>
        {movie.backdrop_path && (
          <BackdropImage
            backdropPath={movie.backdrop_path}
            alt={movie.title ?? movie.original_title ?? t("titleFallback")}
            locale={locale}
          />
        )}
        <div css={styles.hero}>
          <div css={styles.ratingContainer}>
            <div css={styles.rating}>
              {formatter.format(movie.vote_average)}
            </div>
            <div css={styles.count}>{movie.vote_count}</div>
          </div>
          <h1 css={styles.h1}>
            {movie.title ?? movie.original_title ?? t("titleFallback")}
          </h1>
          <div css={styles.meta}>
            {[
              movie.release_date?.split("-")[0],
              `${hours > 0 ? `${hours}${t("hours")} ` : ""}${minutes}${t("minutes")}`,
              movie.genres
                ?.map((genre) => genre.name)
                .filter(Boolean)
                .join(t("comma")),
            ]
              .filter(Boolean)
              .join(" • ")}
          </div>
          {(movie.overview || movie.tagline) && (
            <p css={styles.description}>{movie.overview ?? movie.tagline}</p>
          )}
          <Suspense
            fallback={
              <Skeleton css={styles.trailerButtonSkeleton} width={120} />
            }
          >
            <Trailer movieId={id} locale={locale} />
          </Suspense>
        </div>
      </div>
      <Similar movieId={id} locale={locale} />
    </>
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
    marginBottom: space._10,
    paddingBlock: 0,
    paddingLeft: `env(safe-area-inset-left)`,
    paddingRight: `env(safe-area-inset-right)`,
  },
  hero: {
    paddingTop: {
      default: space._12,
      [breakpoints.md]: `clamp(${space._10}, 20dvw, 30dvh)`,
      [breakpoints.xl]: `min(${space._13}, 30dvh)`,
    },
    paddingInline: space._3,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: space._3,
  },
  h1: {
    fontSize: font.size_6,
    margin: 0,
  },
  meta: {
    fontSize: font.size_0,
    margin: 0,
  },
  description: {
    fontSize: font.size_1,
    margin: 0,
  },
  ratingContainer: {
    width: space._9,
    height: space._9,
    borderRadius: border.radius_round,
    backgroundColor: color.backgroundRaised,
    borderWidth: space._0,
    borderColor: color.textMuted,
    borderStyle: "solid",
    fontSize: font.size_00,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  rating: {
    fontSize: font.size_4,
    fontWeight: font.weight_8,
  },
  count: {
    fontSize: font.size_0,
    color: color.textMuted,
  },
  trailerButtonSkeleton: {
    [skeletonTokens.height]: controlSize._9,
  },
});
