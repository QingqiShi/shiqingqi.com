"use client";

import { FunnelX } from "@phosphor-icons/react/dist/ssr/FunnelX";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { useTranslations } from "@/hooks/use-translations";
import { AnchorButton } from "../shared/anchor-button";
import { MenuLabel } from "../shared/menu-label";
import type translations from "./filters.translations.json";

interface ResetFilterProps {
  bright?: boolean;
  hideLabel?: boolean;
}

export function ResetFilter({ bright, hideLabel }: ResetFilterProps) {
  const { reset, resetUrl } = useMovieFilters();

  const { t } = useTranslations<typeof translations>("filters");

  return (
    <div>
      {!hideLabel && <MenuLabel>{t("resetDescription")}</MenuLabel>}
      <AnchorButton
        href={resetUrl()}
        onClick={(e) => {
          e.preventDefault();
          reset();
        }}
        icon={<FunnelX />}
        bright={bright}
      >
        {t("reset")}
      </AnchorButton>
    </div>
  );
}
