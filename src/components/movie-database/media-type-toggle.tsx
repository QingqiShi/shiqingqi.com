"use client";

import * as stylex from "@stylexjs/stylex";
import { useSearchParams } from "next/navigation";
import { breakpoints } from "@/breakpoints";
import { useMediaFilters } from "@/hooks/use-media-filters";
import { useTranslations } from "@/hooks/use-translations";
import { layer, space } from "@/tokens.stylex";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
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
  );

  if (mobile) {
    return (
      <div css={[styles.mobileContainer, styles.mobileVisible]}>{content}</div>
    );
  }

  return content;
}

const styles = stylex.create({
  mobileVisible: {
    display: { default: "flex", [breakpoints.md]: "none" },
  },
  mobileContainer: {
    position: "fixed",
    bottom: `calc(${space._7} + env(safe-area-inset-bottom))`,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: layer.overlay,
    pointerEvents: "all",
    whiteSpace: "nowrap",
  },
});
