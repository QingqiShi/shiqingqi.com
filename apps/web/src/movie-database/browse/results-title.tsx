"use client";

import * as stylex from "@stylexjs/stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import type { MediaType, Sort } from "#src/movie-database/types.ts";
import { useMediaFilters } from "./filters/use-media-filters.ts";

function resultsTitle(mediaType: MediaType, sort: Sort) {
  if (mediaType === "tv") {
    switch (sort) {
      case "popularity.desc":
        return t({ en: "Popular TV shows", zh: "人气电视剧" });
      case "popularity.asc":
        return t({ en: "Least popular TV shows", zh: "冷门电视剧" });
      case "vote_average.desc":
        return t({ en: "Top-rated TV shows", zh: "高分电视剧" });
      case "vote_average.asc":
        return t({ en: "Lowest-rated TV shows", zh: "低分电视剧" });
    }
  }
  switch (sort) {
    case "popularity.desc":
      return t({ en: "Popular movies", zh: "人气电影" });
    case "popularity.asc":
      return t({ en: "Least popular movies", zh: "冷门电影" });
    case "vote_average.desc":
      return t({ en: "Top-rated movies", zh: "高分电影" });
    case "vote_average.asc":
      return t({ en: "Lowest-rated movies", zh: "低分电影" });
  }
}

/** Names what the results show: the media type, in the sort order. */
export function ResultsTitle({ id }: { id: string }) {
  const { mediaType, sort } = useMediaFilters();
  return (
    <h2 id={id} css={[typeRole.overline, styles.title]}>
      {resultsTitle(mediaType, sort)}
    </h2>
  );
}

const styles = stylex.create({
  title: {
    color: color.fgMuted,
    margin: 0,
  },
});
