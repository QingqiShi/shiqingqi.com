"use client";

import * as stylex from "@stylexjs/stylex";
import { usePathname, useSearchParams } from "next/navigation";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { useTranslations } from "@/hooks/use-translations";
import { controlSize, space } from "@/tokens.stylex";
import type { Genre } from "@/utils/tmdb-api";
import { AnchorButton } from "../shared/anchor-button";
import { MenuButton } from "../shared/menu-button";
import type translations from "./filters.translations.json";

interface GenreFilterProps {
  allGenres?: Genre[];
}

export function GenreFilter({ allGenres }: GenreFilterProps) {
  const { genres, toggleGenre } = useMovieFilters();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslations<typeof translations>("filters");

  return (
    <MenuButton
      disabled={!allGenres?.length}
      buttonProps={{
        type: "button",
        "aria-label": t("genre"),
      }}
      menuContent={
        <div css={styles.menu}>
          {allGenres?.map((genre) => {
            const idString = genre.id.toString();
            const isActive = genres.has(idString);
            const newSearchParams = new URLSearchParams(searchParams);
            if (isActive) {
              newSearchParams.delete("genre", idString);
            } else {
              newSearchParams.append("genre", idString);
            }
            const searchString = newSearchParams.toString();
            return (
              <AnchorButton
                key={genre.id}
                href={`${pathname}${searchString ? `?${searchString}` : ""}`}
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
      }
      position="topLeft"
    >
      {t("genre")}
    </MenuButton>
  );
}

const styles = stylex.create({
  menu: {
    display: "flex",
    flexWrap: "wrap",
    gap: controlSize._2,
    overflow: "auto",
    padding: controlSize._3,
    maxWidth: `min(${space._15}, calc(100vw - ${space._3} - env(safe-area-inset-left) - ${space._3} - env(safe-area-inset-right)))`,
  },
  active: {},
});
