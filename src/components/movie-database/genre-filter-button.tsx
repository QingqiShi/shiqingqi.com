"use client";

import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import { useMediaFilters } from "@/hooks/use-media-filters";
import { useTranslations } from "@/hooks/use-translations";
import { MenuButton } from "../shared/menu-button";
import type translations from "./filters.translations.json";
import { GenreFilter } from "./genre-filter";

export function GenreFilterButton() {
  const { genres } = useMediaFilters();
  const { t } = useTranslations<typeof translations>("filters");

  return (
    <MenuButton
      menuContent={
        <div className="flex items-center flex-wrap gap-4 p-3 max-h-[calc(100dvh-80px-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1em-8px-4px-12px)] overflow-auto">
          <GenreFilter hideTitle />
        </div>
      }
      buttonProps={{
        icon: <FunnelIcon weight="bold" role="presentation" />,
        type: "button",
        isActive: genres.size > 0,
      }}
      position="topLeft"
    >
      {t("genre")}
      {genres.size ? ` (${genres.size})` : null}
    </MenuButton>
  );
}
