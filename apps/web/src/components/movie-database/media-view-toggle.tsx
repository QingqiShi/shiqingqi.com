"use client";

import { GridFourIcon } from "@phosphor-icons/react/dist/ssr/GridFour";
import { RowsIcon } from "@phosphor-icons/react/dist/ssr/Rows";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";

interface MediaViewToggleProps {
  /** Drop the "View" heading. */
  hideLabel?: boolean;
  /** Collapse to icon-only segments for tight bars. */
  iconOnly?: boolean;
}

/**
 * Switches the discover results between the poster grid and the data table.
 */
export function MediaViewToggle({ hideLabel, iconOnly }: MediaViewToggleProps) {
  const { view, setView } = useMediaFilters();

  const gridLabel = t({ en: "Poster grid", zh: "海报网格" });
  const tableLabel = t({ en: "Table", zh: "表格" });

  return (
    <div>
      {!hideLabel && <MenuLabel>{t({ en: "View", zh: "视图" })}</MenuLabel>}
      <SegmentedControl
        aria-label={t({ en: "View", zh: "视图" })}
        hideLabels={iconOnly}
        value={view}
        onChange={setView}
        options={[
          {
            value: "grid",
            label: gridLabel,
            icon: <GridFourIcon weight="bold" />,
          },
          {
            value: "table",
            label: tableLabel,
            icon: <RowsIcon weight="bold" />,
          },
        ]}
      />
    </div>
  );
}
