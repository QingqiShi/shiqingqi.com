"use client";

import { Funnel } from "@phosphor-icons/react/Funnel";
import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { useTranslations } from "@/hooks/use-translations";
import { color, controlSize, space } from "@/tokens.stylex";
import type { Genre } from "@/utils/tmdb-api";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { MenuButton } from "../shared/menu-button";
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
    <MenuButton
      disabled={!allGenres?.length}
      buttonProps={{
        icon: <Funnel weight="bold" role="presentation" />,
        type: "button",
        "aria-label": t("genre"),
        hideLabelOnMobile: true,
      }}
      menuContent={
        <div css={styles.menu}>
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
                >
                  {genre.name}
                </AnchorButton>
              );
            })}
          </div>

          {genres.size > 1 && (
            <div>
              <div css={styles.label}>{t("filterType")}</div>
              <AnchorButtonGroup>
                <AnchorButton
                  href={setGenreFilterTypeUrl("all")}
                  onClick={(e) => {
                    e.preventDefault();
                    setGenreFilterType("all");
                  }}
                  id={`${id}-all`}
                  isActive={genreFilterType === "all"}
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
                >
                  {t("any")}
                </AnchorButton>
              </AnchorButtonGroup>
            </div>
          )}
        </div>
      }
      position="topLeft"
    >
      {t("genre")}
      {genres.size ? ` (${genres.size})` : null}
    </MenuButton>
  );
}

const styles = stylex.create({
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    overflow: "auto",
    padding: controlSize._3,
    width: "100vw",
    maxWidth: `min(${space._15}, calc(100vw - ${space._3} - env(safe-area-inset-left) - ${space._3} - env(safe-area-inset-right)))`,
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
