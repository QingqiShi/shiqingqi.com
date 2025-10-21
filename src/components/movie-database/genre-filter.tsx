"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useId } from "react";
import { useMediaFilters } from "@/hooks/use-media-filters";
import { useTranslations } from "@/hooks/use-translations";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { useTranslationContext } from "@/utils/translation-context";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { MenuLabel } from "../shared/menu-label";
import type translations from "./filters.translations.json";

interface GenreFilterProps {
  hideTitle?: boolean;
}

export function GenreFilter({ hideTitle }: GenreFilterProps) {
  const {
    genres,
    toggleGenre,
    toggleGenreUrl,
    genreFilterType,
    setGenreFilterType,
    setGenreFilterTypeUrl,
    mediaType,
  } = useMediaFilters();

  const { t } = useTranslations<typeof translations>("filters");
  const { locale } = useTranslationContext();

  // Fetch genres based on current media type
  const genreQuery = tmdbQueries.genres({ type: mediaType, language: locale });

  const { data: genreData } = useSuspenseQuery(genreQuery);
  const allGenres = genreData.genres;

  const id = useId();

  return (
    <div className="flex flex-col gap-4 overflow-auto w-[100dvw] max-w-[min(11.25rem,calc(100dvw-0.75rem-env(safe-area-inset-left)-0.75rem-env(safe-area-inset-right)))]">
      <div>
        {!hideTitle && <MenuLabel>{t("genre")}</MenuLabel>}
        <div className="flex flex-wrap gap-2">
          {allGenres?.map((genre) => {
            const idString = genre.id.toString();
            const isActive = genres.has(idString);
            return (
              <AnchorButton
                key={genre.id}
                href={toggleGenreUrl(idString)}
                isActive={isActive}
                onClick={(e) => {
                  e.preventDefault();
                  toggleGenre(idString);
                }}
                rel="nofollow"
                replace
                shallow
                bright
              >
                {genre.name}
              </AnchorButton>
            );
          })}
        </div>
      </div>

      {genres.size > 1 && (
        <div>
          <MenuLabel>{t("filterType")}</MenuLabel>
          <AnchorButtonGroup bright>
            <AnchorButton
              href={setGenreFilterTypeUrl("all")}
              onClick={(e) => {
                e.preventDefault();
                setGenreFilterType("all");
              }}
              id={`${id}-all`}
              isActive={genreFilterType === "all"}
              rel="nofollow"
              bright
            >
              {t("all")}
            </AnchorButton>
            <AnchorButton
              href={setGenreFilterTypeUrl("any")}
              onClick={(e) => {
                e.preventDefault();
                setGenreFilterType("any");
              }}
              id={`${id}-any`}
              isActive={genreFilterType === "any"}
              rel="nofollow"
              bright
            >
              {t("any")}
            </AnchorButton>
          </AnchorButtonGroup>
        </div>
      )}
    </div>
  );
}
