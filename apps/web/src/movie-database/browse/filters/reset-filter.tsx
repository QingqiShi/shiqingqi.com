"use client";

import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import type { MouseEvent } from "react";
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
    look: bright ? ("bright" as const) : undefined,
  };

  return (
    <div>
      {!hideLabel && (
        <MenuLabel>
          {t({ en: "Reset sorting and filters", zh: "重置筛选与排序" })}
        </MenuLabel>
      )}
      {iconOnly ? (
        <Button {...linkProps} aria-label={label} />
      ) : (
        <Button {...linkProps}>{label}</Button>
      )}
    </div>
  );
}
