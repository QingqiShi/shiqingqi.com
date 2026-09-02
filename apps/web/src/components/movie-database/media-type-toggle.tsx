"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { AnchorButtonGroup } from "@tuja/ui/components/anchor-button-group";
import { FixedContainerContent } from "@tuja/ui/components/fixed-container-content";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { AnchorButton } from "../shared/anchor-button";

export function MediaTypeToggle() {
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
          <span css={styles.shortLabel}>{t({ en: "TV", zh: "电视" })}</span>
          <span css={styles.fullLabel}>
            {t({ en: "TV Shows", zh: "电视剧" })}
          </span>
        </AnchorButton>
      </AnchorButtonGroup>
    </FixedContainerContent>
  );
}

// Below `lg` the filter bar has no room for the full label, so the short one
// shows there and the full one from `lg`. Only the shown one is read out.
const styles = stylex.create({
  shortLabel: {
    display: { default: "inline", [breakpoints.lg]: "none" },
  },
  fullLabel: {
    display: { default: "none", [breakpoints.lg]: "inline" },
  },
});
