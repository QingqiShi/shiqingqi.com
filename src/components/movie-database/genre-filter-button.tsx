"use client";

import { Funnel } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { useTranslations } from "@/hooks/use-translations";
import { controlSize, space } from "@/tokens.stylex";
import type { Genre } from "@/utils/tmdb-api";
import { MenuButton } from "../shared/menu-button";
import type translations from "./filters.translations.json";
import { GenreFilter } from "./genre-filter";

interface GenreFilterButtonProps {
  allGenres?: Genre[];
}

export function GenreFilterButton({ allGenres }: GenreFilterButtonProps) {
  const { genres } = useMovieFilters();
  const { t } = useTranslations<typeof translations>("filters");

  return (
    <MenuButton
      menuContent={
        <div css={styles.desktopMenuContent}>
          <GenreFilter allGenres={allGenres} hideTitle />
        </div>
      }
      buttonProps={{
        icon: <Funnel weight="bold" role="presentation" />,
        type: "button",
        isActive: genres.size > 0,
      }}
      position="topLeft"
    >
      {t("genre")}
      {genres.size ? ` (${genres.size})` : null}
    </MenuButton>
  );
}

const styles = stylex.create({
  desktopMenuContent: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: space._4,
    padding: controlSize._3,
    maxHeight: `calc(100dvh - 5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
  },
});
