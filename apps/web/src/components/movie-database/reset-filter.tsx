"use client";

import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "../shared/anchor-button";

interface ResetFilterProps {
  bright?: boolean;
  hideLabel?: boolean;
}

export function ResetFilter({ bright, hideLabel }: ResetFilterProps) {
  const { canReset, reset, resetUrl } = useMediaFilters();

  if (!canReset) {
    return null;
  }

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
      >
        {t({ en: "Reset", zh: "重置" })}
      </AnchorButton>
    </div>
  );
}
