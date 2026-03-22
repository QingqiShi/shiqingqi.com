"use client";

import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { MenuLabel } from "../shared/menu-label";

interface SortFilterProps {
  bright?: boolean;
  hideLabel?: boolean;
}

export function SortFilter({ bright, hideLabel }: SortFilterProps) {
  const { sort, setSort, setSortUrl } = useMediaFilters();

  return (
    <div>
      {!hideLabel && <MenuLabel>{t({ en: "Sort", zh: "排序" })}</MenuLabel>}
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
              sort === "popularity.desc" ? "popularity.asc" : "popularity.desc",
            );
          }}
          bright={bright}
          rel="nofollow"
          prefetch={false}
        >
          {t({ en: "Popularity", zh: "热度" })}
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
                : "vote_average.desc",
            );
          }}
          bright={bright}
          rel="nofollow"
          prefetch={false}
        >
          {t({ en: "Rating", zh: "评分" })}
          {sort === "vote_average.asc" && " ↑"}
          {sort === "vote_average.desc" && " ↓"}
        </AnchorButton>
      </AnchorButtonGroup>
    </div>
  );
}
