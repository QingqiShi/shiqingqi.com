"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import { genresQuery } from "#src/utils/tmdb-queries/genres-query.ts";
import { AnchorButton } from "../shared/anchor-button";

interface GenreFilterProps {
  hideTitle?: boolean;
}

export function GenreFilter({ hideTitle }: GenreFilterProps) {
  const {
    genres,
    toggleGenre,
    toggleGenreUrl,
    matchMode,
    setMatchMode,
    mediaType,
  } = useMediaFilters();

  const locale = useLocale();

  // Fetch genres based on current media type
  const genreQuery = genresQuery({ type: mediaType, language: locale });

  const { data: genreData } = useSuspenseQuery(genreQuery);
  const allGenres = genreData.genres;

  const matchingLabelId = useId();

  return (
    <div css={[flex.col, styles.container]}>
      <div>
        {!hideTitle && <MenuLabel>{t({ en: "Genre", zh: "类型" })}</MenuLabel>}
        <div css={styles.genreList}>
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
                prefetch={false}
              >
                {genre.name}
              </AnchorButton>
            );
          })}
        </div>
      </div>

      {genres.size > 1 && (
        <div>
          <MenuLabel id={matchingLabelId}>
            {t({ en: "Matching", zh: "选中类型" })}
          </MenuLabel>
          <SegmentedControl
            aria-labelledby={matchingLabelId}
            value={matchMode}
            onChange={setMatchMode}
            options={[
              {
                value: "all",
                label: t({ en: "All selected", zh: "全部匹配" }),
              },
              {
                value: "any",
                label: t({ en: "Any selected", zh: "匹配任一" }),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  container: {
    gap: space._4,
    overflow: "auto",
    width: "100dvw",
    maxInlineSize: `min(${space._15}, calc(100dvw - ${space._3} - env(safe-area-inset-left) - ${space._3} - env(safe-area-inset-right)))`,
  },
  genreList: {
    display: "flex",
    flexWrap: "wrap",
    gap: controlSize._2,
  },
});
