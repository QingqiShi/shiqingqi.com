import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { fetchMovieGenres } from "@/utils/tmdb-api";
import { GenreFilter } from "./genre-filter";
import { SortFilter } from "./sort-filter";

interface FiltersProps {
  locale: SupportedLocale;
}

export async function Filters({ locale }: FiltersProps) {
  const { genres } = await fetchMovieGenres({ language: locale });
  return (
    <div css={styles.container}>
      <GenreFilter allGenres={genres} />
      <SortFilter />
    </div>
  );
}

const styles = stylex.create({
  container: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: space._1,
    marginInline: "auto",
    marginTop: "5rem",
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    paddingBottom: space._2,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    whiteSpace: "nowrap",
  },
});
