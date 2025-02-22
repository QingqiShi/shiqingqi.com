"use client";

import { useMovieFilters } from "@/hooks/use-movie-filters";
import { useTranslations } from "@/hooks/use-translations";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import type translations from "./filters.translations.json";

export function SortFilter() {
  const { sort, setSort, setSortUrl } = useMovieFilters();
  const { t } = useTranslations<typeof translations>("filters");

  return (
    <AnchorButtonGroup>
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
      >
        {t("rating")}
        {sort === "vote_average.asc" && " ↑"}
        {sort === "vote_average.desc" && " ↓"}
      </AnchorButton>
    </AnchorButtonGroup>
  );
}
