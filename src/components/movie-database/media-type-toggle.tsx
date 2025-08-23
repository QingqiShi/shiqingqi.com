"use client";

import * as stylex from "@stylexjs/stylex";
import { usePathname } from "next/navigation";
import { breakpoints } from "@/breakpoints";
import { useTranslations } from "@/hooks/use-translations";
import { layer, space } from "@/tokens.stylex";
import { getLocalePath } from "@/utils/pathname";
import { useTranslationContext } from "@/utils/translation-context";
import { AnchorButton } from "../shared/anchor-button";
import { AnchorButtonGroup } from "../shared/anchor-button-group";
import type translations from "./media-type-toggle.translations.json";

interface MediaTypeToggleProps {
  mobile?: boolean;
}

export function MediaTypeToggle({ mobile }: MediaTypeToggleProps) {
  const { t } = useTranslations<typeof translations>("mediaTypeToggle");
  const { locale } = useTranslationContext();
  const pathname = usePathname();

  const isMovies = !pathname.includes("/tv");
  const isTv = pathname.includes("/tv");

  const content = (
    <AnchorButtonGroup>
      <AnchorButton
        href={getLocalePath("/movie-database", locale)}
        isActive={isMovies}
      >
        {mobile ? t("moviesShort") : t("movies")}
      </AnchorButton>
      <AnchorButton
        href={getLocalePath("/movie-database/tv", locale)}
        isActive={isTv}
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
