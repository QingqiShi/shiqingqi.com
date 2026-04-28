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

type SortDirection = "asc" | "desc" | null;

export function SortFilter({ bright, hideLabel }: SortFilterProps) {
  const { sort, setSort, setSortUrl } = useMediaFilters();

  const popularityDirection: SortDirection =
    sort === "popularity.asc"
      ? "asc"
      : sort === "popularity.desc"
        ? "desc"
        : null;
  const ratingDirection: SortDirection =
    sort === "vote_average.asc"
      ? "asc"
      : sort === "vote_average.desc"
        ? "desc"
        : null;

  const popularityLabel = t({ en: "Popularity", zh: "热度" });
  const ratingLabel = t({ en: "Rating", zh: "评分" });

  const sortByPrefix = t({ en: "Sort by ", zh: "按 " });
  const descendingClause = t({
    en: ", descending. Activate to sort ascending.",
    zh: " 排序，降序。点击切换为升序。",
  });
  const ascendingClause = t({
    en: ", ascending. Activate to sort descending.",
    zh: " 排序，升序。点击切换为降序。",
  });
  const inactiveClause = t({ en: ".", zh: " 排序。" });

  function buildAriaLabel(fieldLabel: string, direction: SortDirection) {
    const suffix =
      direction === "asc"
        ? ascendingClause
        : direction === "desc"
          ? descendingClause
          : inactiveClause;
    return `${sortByPrefix}${fieldLabel}${suffix}`;
  }

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
          isActive={popularityDirection !== null}
          onClick={(e) => {
            e.preventDefault();
            setSort(
              sort === "popularity.desc" ? "popularity.asc" : "popularity.desc",
            );
          }}
          aria-label={buildAriaLabel(popularityLabel, popularityDirection)}
          bright={bright}
          rel="nofollow"
          prefetch={false}
        >
          {popularityLabel}
          {popularityDirection === "asc" && (
            <span aria-hidden="true">{" ↑"}</span>
          )}
          {popularityDirection === "desc" && (
            <span aria-hidden="true">{" ↓"}</span>
          )}
        </AnchorButton>
        <AnchorButton
          href={
            sort === "vote_average.desc"
              ? setSortUrl("vote_average.asc")
              : setSortUrl("vote_average.desc")
          }
          isActive={ratingDirection !== null}
          onClick={(e) => {
            e.preventDefault();
            setSort(
              sort === "vote_average.desc"
                ? "vote_average.asc"
                : "vote_average.desc",
            );
          }}
          aria-label={buildAriaLabel(ratingLabel, ratingDirection)}
          bright={bright}
          rel="nofollow"
          prefetch={false}
        >
          {ratingLabel}
          {ratingDirection === "asc" && <span aria-hidden="true">{" ↑"}</span>}
          {ratingDirection === "desc" && <span aria-hidden="true">{" ↓"}</span>}
        </AnchorButton>
      </AnchorButtonGroup>
    </div>
  );
}
