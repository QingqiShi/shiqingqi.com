"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { GridFourIcon } from "@phosphor-icons/react/dist/ssr/GridFour";
import { RowsIcon } from "@phosphor-icons/react/dist/ssr/Rows";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";

/** The movie database's own sort switch: the selected field carries the arrow. */
export function SortControl() {
  const [field, setField] = useState<"popularity" | "rating">("popularity");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const labels = {
    popularity: t({ en: "Popularity", zh: "热度" }),
    rating: t({ en: "Rating", zh: "评分" }),
  };
  const clauses = {
    desc: t({
      en: ", descending. Activate to sort ascending.",
      zh: " 排序，降序。点击切换为升序。",
    }),
    asc: t({
      en: ", ascending. Activate to sort descending.",
      zh: " 排序，升序。点击切换为降序。",
    }),
  };
  const arrow =
    direction === "asc" ? (
      <ArrowUpIcon weight="bold" />
    ) : (
      <ArrowDownIcon weight="bold" />
    );

  return (
    <SegmentedControl
      aria-label={t({ en: "Sort", zh: "排序" })}
      value={field}
      onChange={(next) => {
        setField(next);
        setDirection(next === field && direction === "desc" ? "asc" : "desc");
      }}
      options={(["popularity", "rating"] as const).map((value) =>
        value === field
          ? {
              value,
              label: labels[value],
              selectedIcon: arrow,
              "aria-label": `${labels[value]}${clauses[direction]}`,
            }
          : { value, label: labels[value], selectedIcon: arrow },
      )}
    />
  );
}

/** The movie database's own poster grid / table switch, icons standing alone. */
export function IconOnlyViewControl() {
  const [view, setView] = useState<"grid" | "table">("grid");
  return (
    <SegmentedControl
      aria-label={t({ en: "View", zh: "视图" })}
      hideLabels
      value={view}
      onChange={setView}
      options={[
        {
          value: "grid",
          label: t({ en: "Poster grid", zh: "海报网格" }),
          icon: <GridFourIcon weight="bold" />,
        },
        {
          value: "table",
          label: t({ en: "Table", zh: "表格" }),
          icon: <RowsIcon weight="bold" />,
        },
      ]}
    />
  );
}

/** Holds the selected view — `SegmentedControl` is controlled by contract. */
export function ViewControl({
  options,
  size,
  fullWidth,
}: {
  /** Ordered segments, exactly as `SegmentedControl` takes them. */
  options: readonly { value: string; label: ReactNode; icon?: ReactNode }[];
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  const [view, setView] = useState(options[0].value);

  return (
    <SegmentedControl
      aria-label={t({ en: "View", zh: "视图" })}
      options={options}
      value={view}
      onChange={setView}
      size={size}
      fullWidth={fullWidth}
    />
  );
}
