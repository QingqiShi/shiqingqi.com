"use client";

import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { FixedContainerContent } from "../shared/fixed-container-content";

interface MediaTypeToggleProps {
  shortLabels?: boolean;
}

export function MediaTypeToggle({ shortLabels }: MediaTypeToggleProps) {
  // Read `mediaType` from the filters context rather than `useSearchParams()`.
  // The provider commits filter changes via `window.history.replaceState`,
  // which Next's `SearchParamsContext` does not observe — so reading from
  // `useSearchParams()` here would leave the active highlight stuck on the
  // previous choice until the next real navigation.
  const { mediaType, setMediaType, setMediaTypeUrl } = useMediaFilters();

  const isTv = mediaType === "tv";
  const isMovies = !isTv;

  const handleMovieClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMediaType("movie");
  };

  const handleTvClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMediaType("tv");
  };

  return (
    <FixedContainerContent>
      <AnchorButtonGroup>
        <AnchorButton
          href={setMediaTypeUrl("movie")}
          isActive={isMovies}
          onClick={handleMovieClick}
        >
          {t({ en: "Movies", zh: "电影" })}
        </AnchorButton>
        <AnchorButton
          href={setMediaTypeUrl("tv")}
          isActive={isTv}
          onClick={handleTvClick}
        >
          {shortLabels
            ? t({ en: "TV", zh: "电视" })
            : t({ en: "TV Shows", zh: "电视剧" })}
        </AnchorButton>
      </AnchorButtonGroup>
    </FixedContainerContent>
  );
}
