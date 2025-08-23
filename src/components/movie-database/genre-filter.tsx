"use client";

import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { useMediaFilters } from "@/hooks/use-media-filters";
import { useTranslations } from "@/hooks/use-translations";
import { controlSize, space } from "@/tokens.stylex";
import type { Genre } from "@/utils/tmdb-api";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { MenuLabel } from "../shared/menu-label";
import type translations from "./filters.translations.json";

interface GenreFilterProps {
  allGenres?: Genre[];
  hideTitle?: boolean;
}

export function GenreFilter({ allGenres, hideTitle }: GenreFilterProps) {
  const {
    genres,
    toggleGenre,
    toggleGenreUrl,
    genreFilterType,
    setGenreFilterType,
    setGenreFilterTypeUrl,
  } = useMediaFilters();

  const { t } = useTranslations<typeof translations>("filters");

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
    maxWidth: `min(${space._15}, calc(100dvw - ${space._3} - env(safe-area-inset-left) - ${space._3} - env(safe-area-inset-right)))`,
  },
  genreList: {
    display: "flex",
    flexWrap: "wrap",
    gap: controlSize._2,
  },
});
