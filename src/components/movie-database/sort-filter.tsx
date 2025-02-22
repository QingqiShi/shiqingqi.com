"use client";

import * as stylex from "@stylexjs/stylex";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { useTranslations } from "@/hooks/use-translations";
import { color, controlSize } from "@/tokens.stylex";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import type translations from "./filters.translations.json";

interface SortFilter {
  bright?: boolean;
  hideLabel?: boolean;
}

export function SortFilter({ bright, hideLabel }: SortFilter) {
  const { sort, setSort, setSortUrl } = useMovieFilters();
  const { t } = useTranslations<typeof translations>("filters");

  return (
    <div>
      {!hideLabel && <div css={styles.label}>{t("sort")}</div>}
      <AnchorButtonGroup bright={bright}>
        <AnchorButton
          href={
            sort === "popularity.desc"
              ? setSortUrl("popularity.asc")
              : setSortUrl("popularity.desc")
          }
          isActive={sort === "popularity.asc" || sort === "popularity.desc"}
          onClick={(e) => {
            e.preventDefault();
            setSort(
              sort === "popularity.desc" ? "popularity.asc" : "popularity.desc"
            );
          }}
          bright={bright}
        >
          {t("popularity")}
          {sort === "popularity.asc" && " ↑"}
          {sort === "popularity.desc" && " ↓"}
        </AnchorButton>
        <AnchorButton
          href={
            sort === "vote_average.desc"
              ? setSortUrl("vote_average.asc")
              : setSortUrl("vote_average.desc")
          }
          isActive={sort === "vote_average.asc" || sort === "vote_average.desc"}
          onClick={(e) => {
            e.preventDefault();
            setSort(
              sort === "vote_average.desc"
                ? "vote_average.asc"
                : "vote_average.desc"
            );
          }}
          bright={bright}
        >
          {t("rating")}
          {sort === "vote_average.asc" && " ↑"}
          {sort === "vote_average.desc" && " ↓"}
        </AnchorButton>
      </AnchorButtonGroup>
    </div>
  );
}

const styles = stylex.create({
  label: {
    fontSize: controlSize._3,
    padding: `0 0 ${controlSize._2}`,
    color: color.textMuted,
  },
});
