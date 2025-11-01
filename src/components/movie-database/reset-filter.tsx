"use client";

import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { useTranslations } from "#src/hooks/use-translations.ts";
import { AnchorButton } from "../shared/anchor-button";
import { MenuLabel } from "../shared/menu-label";
import type translations from "./filters.translations.json";

interface ResetFilterProps {
  bright?: boolean;
  hideLabel?: boolean;
}

export function ResetFilter({ bright, hideLabel }: ResetFilterProps) {
  const { canReset, reset, resetUrl } = useMediaFilters();

  const { t } = useTranslations<typeof translations>("filters");

  if (!canReset) {
    return null;
  }

  return (
    <div>
      {!hideLabel && <MenuLabel>{t("resetDescription")}</MenuLabel>}
      <AnchorButton
        href={resetUrl()}
        onClick={(e) => {
          e.preventDefault();
          reset();
        }}
        icon={<FunnelXIcon />}
        bright={bright}
      >
        {t("reset")}
      </AnchorButton>
    </div>
  );
}
