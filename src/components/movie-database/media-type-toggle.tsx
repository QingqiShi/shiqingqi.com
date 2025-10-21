"use client";

import { useSearchParams } from "next/navigation";
import { useMediaFilters } from "@/hooks/use-media-filters";
import { useTranslations } from "@/hooks/use-translations";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { FixedContainerContent } from "../shared/fixed-container-content";
import type translations from "./media-type-toggle.translations.json";

interface MediaTypeToggleProps {
  mobile?: boolean;
}

export function MediaTypeToggle({ mobile }: MediaTypeToggleProps) {
  const { t } = useTranslations<typeof translations>("mediaTypeToggle");
  const searchParams = useSearchParams();
  const { setMediaType, setMediaTypeUrl } = useMediaFilters();

  const currentType = searchParams.get("type");
  const isTv = currentType === "tv";
  const isMovies = !isTv;

  const handleMovieClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMediaType("movie");
  };

  const handleTvClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMediaType("tv");
  };

  const content = (
    <FixedContainerContent>
      <AnchorButtonGroup>
        <AnchorButton
          href={setMediaTypeUrl("movie")}
          isActive={isMovies}
          onClick={handleMovieClick}
        >
          {mobile ? t("moviesShort") : t("movies")}
        </AnchorButton>
        <AnchorButton
          href={setMediaTypeUrl("tv")}
          isActive={isTv}
          onClick={handleTvClick}
        >
          {mobile ? t("tvShowsShort") : t("tvShows")}
        </AnchorButton>
      </AnchorButtonGroup>
    </FixedContainerContent>
  );

  if (mobile) {
    return (
      <div className="flex md:hidden fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-[calc(50%-var(--removed-body-scroll-bar-size,0px)/2)] -translate-x-1/2 z-overlay pointer-events-auto whitespace-nowrap will-change-transform">
        {content}
      </div>
    );
  }

  return content;
}
