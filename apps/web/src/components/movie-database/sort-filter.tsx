"use client";

import { MenuLabel } from "@tuja/ui/components/menu-label";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import type { Sort } from "#src/utils/sort.ts";

interface SortFilterProps {
  hideLabel?: boolean;
}

type SortField = "popularity" | "vote_average";
type SortDirection = "asc" | "desc";

// Keyed lookup rather than a template literal, so building a `Sort` value
// never needs a type assertion.
const sortValues: Record<SortField, Record<SortDirection, Sort>> = {
  popularity: { asc: "popularity.asc", desc: "popularity.desc" },
  vote_average: { asc: "vote_average.asc", desc: "vote_average.desc" },
};

export function SortFilter({ hideLabel }: SortFilterProps) {
  const { sort, setSort } = useMediaFilters();

  const field: SortField = sort.startsWith("popularity")
    ? "popularity"
    : "vote_average";
  const direction: SortDirection = sort.endsWith(".asc") ? "asc" : "desc";

  const fieldLabels: Record<SortField, string> = {
    popularity: t({ en: "Popularity", zh: "热度" }),
    vote_average: t({ en: "Rating", zh: "评分" }),
  };
  const directionClauses: Record<SortDirection, string> = {
    desc: t({
      en: ", descending. Activate to sort ascending.",
      zh: " 排序，降序。点击切换为升序。",
    }),
    asc: t({
      en: ", ascending. Activate to sort descending.",
      zh: " 排序，升序。点击切换为降序。",
    }),
  };

  // Re-selecting the current field flips its direction; picking the other
  // field starts it descending.
  function handleChange(next: SortField) {
    const nextDirection =
      next === field ? (direction === "desc" ? "asc" : "desc") : "desc";
    setSort(sortValues[next][nextDirection]);
  }

  return (
    <div>
      {!hideLabel && <MenuLabel>{t({ en: "Sort", zh: "排序" })}</MenuLabel>}
      <SegmentedControl
        aria-label={t({ en: "Sort", zh: "排序" })}
        value={field}
        onChange={handleChange}
        options={(["popularity", "vote_average"] as const).map((value) =>
          value === field
            ? {
                value,
                label: `${fieldLabels[value]} ${direction === "asc" ? "↑" : "↓"}`,
                // The arrow alone cannot say what a second activation does.
                "aria-label": `${fieldLabels[value]}${directionClauses[direction]}`,
              }
            : { value, label: fieldLabels[value] },
        )}
      />
    </div>
  );
}
