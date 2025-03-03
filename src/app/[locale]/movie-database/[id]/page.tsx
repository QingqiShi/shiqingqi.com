import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { breakpoints } from "@/breakpoints";
import { BackdropImage } from "@/components/movie-database/backdrop-image";
import { border, color, font, space } from "@/tokens.stylex";
import { getTranslations } from "@/utils/get-translations";
import { fetchMovieDetails } from "@/utils/tmdb-api";
import translations from "./translations.json";
import type { PageProps } from "./types";

export default async function Page({ params }: PageProps) {
  const { id, locale } = await params;
  const { t } = getTranslations(translations, locale);

  const movie = await fetchMovieDetails(id, { language: locale });
  const hours = Math.floor(movie.runtime / 60);
  const minutes = movie.runtime % 60;

  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <>
      {movie.backdrop_path && (
        <Suspense fallback={null}>
          <BackdropImage
            backdropPath={movie.backdrop_path}
            alt={movie.title ?? movie.original_title ?? t("titleFallback")}
            locale={locale}
          />
        </Suspense>
      )}
      <div css={styles.hero}>
        <div css={styles.ratingContainer}>
          <div css={styles.rating}>{formatter.format(movie.vote_average)}</div>
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
      </div>
    </>
  );
}

const styles = stylex.create({
  hero: {
    paddingTop: {
      default: space._12,
      [breakpoints.md]: `clamp(${space._10}, 20dvw, 30dvh)`,
      [breakpoints.xl]: `min(${space._13}, 30dvh)`,
    },
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
});
