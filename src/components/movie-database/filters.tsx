import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { fetchMovieGenres } from "@/utils/tmdb-api";
import { GenreFilter } from "./genre-filter";

interface FiltersProps {
  locale: SupportedLocale;
}

export async function Filters({ locale }: FiltersProps) {
  const { genres } = await fetchMovieGenres({ language: locale });
  return (
    <div css={styles.container}>
      <GenreFilter allGenres={genres} />
    </div>
  );
}

const styles = stylex.create({
  container: {
    marginTop: "5rem",
    marginInline: "auto",
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    paddingBottom: space._2,
  },
});
