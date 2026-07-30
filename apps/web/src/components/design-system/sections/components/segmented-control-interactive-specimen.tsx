"use client";

import { GridFourIcon } from "@phosphor-icons/react/dist/ssr/GridFour";
import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { RowsIcon } from "@phosphor-icons/react/dist/ssr/Rows";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";

type View =
  "grid" | "list" | "compact" | "table" | "gallery" | "timeline" | "map";

interface SegmentedControlInteractiveSpecimenProps {
  /** Height and type scale to demonstrate. */
  size?: "sm" | "md";
  /** Stretches the track to fill the showcase width. */
  fullWidth?: boolean;
  /** Adds a leading icon to the first three segments. */
  withIcons?: boolean;
  /** How many of the seven views to offer. Defaults to two. */
  count?: number;
}

/**
 * Interactive island for the segmented-control page. The control is controlled
 * by contract, so every specimen needs real state and therefore a client
 * boundary; keeping it here lets the showcase itself stay a server component.
 *
 * All `t()` strings resolve unconditionally at the top of render, so slicing the
 * option list never varies the hook call order.
 */
export function SegmentedControlInteractiveSpecimen({
  size = "md",
  fullWidth = false,
  withIcons = false,
  count = 2,
}: SegmentedControlInteractiveSpecimenProps) {
  const [value, setValue] = useState<View>("grid");

  const labels: Record<View, string> = {
    grid: t({ en: "Grid", zh: "网格" }),
    list: t({ en: "List", zh: "列表" }),
    compact: t({ en: "Compact", zh: "紧凑" }),
    table: t({ en: "Table", zh: "表格" }),
    gallery: t({ en: "Gallery", zh: "画廊" }),
    timeline: t({ en: "Timeline", zh: "时间线" }),
    map: t({ en: "Map", zh: "地图" }),
  };
  const groupLabel = t({ en: "View", zh: "视图" });

  const icons: Partial<Record<View, ReactNode>> = withIcons
    ? {
        grid: <GridFourIcon weight="bold" />,
        list: <ListIcon weight="bold" />,
        compact: <RowsIcon weight="bold" />,
      }
    : {};

  const order: View[] = [
    "grid",
    "list",
    "compact",
    "table",
    "gallery",
    "timeline",
    "map",
  ];
  const options = order.slice(0, count).map((view) => ({
    value: view,
    label: labels[view],
    icon: icons[view],
  }));

  return (
    <SegmentedControl
      aria-label={groupLabel}
      options={options}
      value={value}
      onChange={setValue}
      size={size}
      fullWidth={fullWidth}
    />
  );
}
