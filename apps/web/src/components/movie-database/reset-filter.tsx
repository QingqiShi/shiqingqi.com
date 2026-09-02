"use client";

import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "../shared/anchor-button";

interface ResetFilterProps {
  bright?: boolean;
  hideLabel?: boolean;
  /** Below this breakpoint, the button collapses to its icon. */
  iconOnlyBelow?: "md" | "lg";
}

export function ResetFilter({
  bright,
  hideLabel,
  iconOnlyBelow,
}: ResetFilterProps) {
  const { canReset, reset, resetUrl } = useMediaFilters();

  if (!canReset) {
    return null;
  }

  const label = t({ en: "Reset", zh: "重置" });

  return (
    <div>
      {!hideLabel && (
        <MenuLabel>
          {t({ en: "Reset sorting and filters", zh: "重置筛选与排序" })}
        </MenuLabel>
      )}
      <AnchorButton
        href={resetUrl()}
        onClick={(e) => {
          e.preventDefault();
          reset();
        }}
        icon={<FunnelXIcon aria-hidden="true" />}
        bright={bright}
        hideLabelBelow={iconOnlyBelow}
        aria-label={iconOnlyBelow && label}
      >
        {label}
      </AnchorButton>
    </div>
  );
}
