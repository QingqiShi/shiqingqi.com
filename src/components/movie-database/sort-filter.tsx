"use client";

import { useMediaFilters } from "@/hooks/use-media-filters";
import { useTranslations } from "@/hooks/use-translations";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { MenuLabel } from "../shared/menu-label";
import type translations from "./filters.translations.json";

interface SortFilterProps {
  bright?: boolean;
  hideLabel?: boolean;
}

export function SortFilter({ bright, hideLabel }: SortFilterProps) {
  const { sort, setSort, setSortUrl } = useMediaFilters();
  const { t } = useTranslations<typeof translations>("filters");

  return (
    <div>
      {!hideLabel && <MenuLabel>{t("sort")}</MenuLabel>}
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
          rel="nofollow"
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
          rel="nofollow"
        >
          {t("rating")}
          {sort === "vote_average.asc" && " ↑"}
          {sort === "vote_average.desc" && " ↓"}
        </AnchorButton>
      </AnchorButtonGroup>
    </div>
  );
}
