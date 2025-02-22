"use client";

import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { useTranslations } from "@/hooks/use-translations";
import { color, controlSize, space } from "@/tokens.stylex";
import type { Genre } from "@/utils/tmdb-api";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import type translations from "./filters.translations.json";

interface GenreFilterProps {
  allGenres?: Genre[];
}

export function GenreFilter({ allGenres }: GenreFilterProps) {
  const {
    genres,
    toggleGenre,
    toggleGenreUrl,
    genreFilterType,
    setGenreFilterType,
    setGenreFilterTypeUrl,
  } = useMovieFilters();

  const { t } = useTranslations<typeof translations>("filters");

  const id = useId();

  return (
    <div css={styles.container}>
      <div>
        <div css={styles.label}>{t("genre")}</div>
        <div css={styles.genreList}>
          {allGenres?.map((genre) => {
            const idString = genre.id.toString();
            const isActive = genres.has(idString);
            return (
              <AnchorButton
                key={genre.id}
                href={toggleGenreUrl(idString)}
                isActive={isActive}
                onClick={(e) => {
                  e.preventDefault();
                  toggleGenre(idString);
                }}
                replace
                shallow
                bright
              >
                {genre.name}
              </AnchorButton>
            );
          })}
        </div>
      </div>

      {genres.size > 1 && (
        <div>
          <div css={styles.label}>{t("filterType")}</div>
          <AnchorButtonGroup bright>
            <AnchorButton
              href={setGenreFilterTypeUrl("all")}
              onClick={(e) => {
                e.preventDefault();
                setGenreFilterType("all");
              }}
              id={`${id}-all`}
              isActive={genreFilterType === "all"}
              bright
            >
              {t("all")}
            </AnchorButton>
            <AnchorButton
              href={setGenreFilterTypeUrl("any")}
              onClick={(e) => {
                e.preventDefault();
                setGenreFilterType("any");
              }}
              id={`${id}-any`}
              isActive={genreFilterType === "any"}
              bright
            >
              {t("any")}
            </AnchorButton>
          </AnchorButtonGroup>
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    overflow: "auto",
    width: "100dvw",
    maxWidth: `min(${space._15}, calc(100dvw - ${space._3} - env(safe-area-inset-left) - ${space._3} - env(safe-area-inset-right)))`,
  },
  genreList: {
    display: "flex",
    flexWrap: "wrap",
    gap: controlSize._2,
  },
  label: {
    fontSize: controlSize._3,
    padding: `0 0 ${controlSize._2}`,
    color: color.textMuted,
  },
});
