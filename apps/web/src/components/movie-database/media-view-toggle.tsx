"use client";

import { GridFourIcon } from "@phosphor-icons/react/dist/ssr/GridFour";
import { RowsIcon } from "@phosphor-icons/react/dist/ssr/Rows";
import { AnchorButtonGroup } from "@tuja/ui/components/anchor-button-group";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "../shared/anchor-button";

interface MediaViewToggleProps {
  /** Lift onto a bright surface, for use inside the mobile filters menu. */
  bright?: boolean;
  /** Drop the "View" heading. */
  hideLabel?: boolean;
  /** Collapse to icon-only buttons for tight bars. */
  iconOnly?: boolean;
}

/**
 * A click the browser should handle itself: ⌘/Ctrl for a background tab, Shift
 * for a new window, Alt to download, or a non-primary button. Swallowing these
 * would make the anchors lie about being links.
 */
function isModifiedClick(e: React.MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/**
 * Switches the discover results between the poster grid and the data table.
 * Mirrors `MediaTypeToggle`: real links so the choice is shareable, with the
 * click intercepted so the swap happens without a navigation.
 */
export function MediaViewToggle({
  bright,
  hideLabel,
  iconOnly,
}: MediaViewToggleProps) {
  const { view, setView, setViewUrl } = useMediaFilters();

  const isTable = view === "table";
  const gridLabel = t({ en: "Poster grid", zh: "海报网格" });
  const tableLabel = t({ en: "Table", zh: "表格" });

  return (
    <div>
      {!hideLabel && <MenuLabel>{t({ en: "View", zh: "视图" })}</MenuLabel>}
      <AnchorButtonGroup bright={bright}>
        <AnchorButton
          href={setViewUrl("grid")}
          isActive={!isTable}
          icon={<GridFourIcon weight="bold" />}
          aria-label={iconOnly ? gridLabel : undefined}
          bright={bright}
          rel="nofollow"
          replace
          shallow
          prefetch={false}
          onClick={(e) => {
            if (isModifiedClick(e)) return;
            e.preventDefault();
            setView("grid");
          }}
        >
          {iconOnly ? undefined : gridLabel}
        </AnchorButton>
        <AnchorButton
          href={setViewUrl("table")}
          isActive={isTable}
          icon={<RowsIcon weight="bold" />}
          aria-label={iconOnly ? tableLabel : undefined}
          bright={bright}
          rel="nofollow"
          replace
          shallow
          prefetch={false}
          onClick={(e) => {
            if (isModifiedClick(e)) return;
            e.preventDefault();
            setView("table");
          }}
        >
          {iconOnly ? undefined : tableLabel}
        </AnchorButton>
      </AnchorButtonGroup>
    </div>
  );
}
