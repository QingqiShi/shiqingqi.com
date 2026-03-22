"use client";

import * as stylex from "@stylexjs/stylex";
import { useSearchParams } from "next/navigation";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { layer, space } from "#src/tokens.stylex.ts";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import { FixedContainerContent } from "../shared/fixed-container-content";

interface MediaTypeToggleProps {
  mobile?: boolean;
}

export function MediaTypeToggle({ mobile }: MediaTypeToggleProps) {
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
          {t({ en: "Movies", zh: "电影" })}
        </AnchorButton>
        <AnchorButton
          href={setMediaTypeUrl("tv")}
          isActive={isTv}
          onClick={handleTvClick}
        >
          {mobile
            ? t({ en: "TV", zh: "电视" })
            : t({ en: "TV Shows", zh: "电视剧" })}
        </AnchorButton>
      </AnchorButtonGroup>
    </FixedContainerContent>
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
    bottom: `calc(${space._2} + env(safe-area-inset-bottom))`,
    left: `calc(50% - var(--removed-body-scroll-bar-size, 0px) / 2)`,
    transform: "translateX(-50%)",
    zIndex: layer.overlay,
    pointerEvents: "all",
    whiteSpace: "nowrap",
    willChange: "transform",
  },
});
