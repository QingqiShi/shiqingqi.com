"use client";

import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import type { MouseEvent } from "react";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import { useMediaFilters } from "./use-media-filters";

interface ResetFilterProps {
  bright?: boolean;
  hideLabel?: boolean;
  /** Renders as a square icon-only link, named by its `aria-label`. */
  iconOnly?: boolean;
}

export function ResetFilter({ bright, hideLabel, iconOnly }: ResetFilterProps) {
  const { canReset, reset, resetUrl } = useMediaFilters();

  if (!canReset) {
    return null;
  }

  const label = t({ en: "Reset", zh: "重置" });

  const linkProps = {
    href: resetUrl(),
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      reset();
    },
    icon: <FunnelXIcon weight="bold" aria-hidden="true" />,
    bright,
  };

  return (
    <div>
      {!hideLabel && (
        <MenuLabel>
          {t({ en: "Reset sorting and filters", zh: "重置筛选与排序" })}
        </MenuLabel>
      )}
      {iconOnly ? (
        <AnchorButton {...linkProps} aria-label={label} />
      ) : (
        <AnchorButton {...linkProps}>{label}</AnchorButton>
      )}
    </div>
  );
}
