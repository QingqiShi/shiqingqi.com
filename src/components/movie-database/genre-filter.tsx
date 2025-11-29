"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useId } from "react";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { useTranslations } from "#src/hooks/use-translations.ts";
import { controlSize, space } from "#src/tokens.stylex.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { useTranslationContext } from "#src/utils/translation-context.ts";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { MenuLabel } from "../shared/menu-label";
import type translations from "./filters.translations.json";

interface GenreFilterProps {
  hideTitle?: boolean;
}

export function GenreFilter({ hideTitle }: GenreFilterProps) {
  const {
    genres,
    toggleGenre,
    toggleGenreUrl,
    genreFilterType,
    setGenreFilterType,
    setGenreFilterTypeUrl,
    mediaType,
  } = useMediaFilters();

  const { t } = useTranslations<typeof translations>("filters");
  const { locale } = useTranslationContext();

  // Fetch genres based on current media type
  const genreQuery = tmdbQueries.genres({ type: mediaType, language: locale });

  const { data: genreData } = useSuspenseQuery(genreQuery);
  const allGenres = genreData.genres;

  const id = useId();

  return (
    <div css={styles.container}>
      <div>
        {!hideTitle && <MenuLabel>{t("genre")}</MenuLabel>}
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
                rel="nofollow"
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
          <MenuLabel>{t("filterType")}</MenuLabel>
          <AnchorButtonGroup bright>
            <AnchorButton
              href={setGenreFilterTypeUrl("all")}
              onClick={(e) => {
                e.preventDefault();
                setGenreFilterType("all");
              }}
              id={`${id}-all`}
              isActive={genreFilterType === "all"}
              rel="nofollow"
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
              rel="nofollow"
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
    maxInlineSize: `min(${space._15}, calc(100dvw - ${space._3} - env(safe-area-inset-left) - ${space._3} - env(safe-area-inset-right)))`,
  },
  genreList: {
    display: "flex",
    flexWrap: "wrap",
    gap: controlSize._2,
  },
});
