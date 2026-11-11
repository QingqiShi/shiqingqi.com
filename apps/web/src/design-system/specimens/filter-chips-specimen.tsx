"use client";

import { t } from "@tuja/i18n";
import { FilterChips } from "@tuja/ui/components/filter-chips";

function ignore() {
  return undefined;
}

/**
 * Two chips with counts, the first picked: a row that fits the narrowest
 * tile, so no chip is cut at the edge. `FilterChips` is controlled
 * only, so this client island gives it an `onChange` that does nothing: the
 * tile is inert, and nothing can call it.
 */
export function FilterChipsSpecimen() {
  return (
    <FilterChips
      aria-label={t({ en: "Show", zh: "显示" })}
      size="xs"
      value="all"
      onChange={ignore}
      options={[
        { value: "all", label: t({ en: "All", zh: "全部" }), count: 64 },
        { value: "filed", label: t({ en: "Filed", zh: "已归档" }), count: 48 },
      ]}
    />
  );
}
