"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useId } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { controlSize, space } from "#src/tokens.stylex.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { MenuLabel } from "../shared/menu-label";

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

  const locale = useLocale();

  // Fetch genres based on current media type
  const genreQuery = tmdbQueries.genres({ type: mediaType, language: locale });

  const { data: genreData } = useSuspenseQuery(genreQuery);
  const allGenres = genreData.genres;

  const id = useId();

  return (
    <div css={styles.container}>
      <div>
        {!hideTitle && <MenuLabel>{t({ en: "Genre", zh: "类型" })}</MenuLabel>}
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
                prefetch={false}
              >
                {genre.name}
              </AnchorButton>
            );
          })}
        </div>
      </div>

      {genres.size > 1 && (
        <div>
          <MenuLabel>{t({ en: "Matching", zh: "选中类型" })}</MenuLabel>
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
              {t({ en: "All selected", zh: "全部匹配" })}
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
              {t({ en: "Any selected", zh: "匹配任一" })}
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
