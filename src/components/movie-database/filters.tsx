import { Funnel } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { controlSize, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { fetchMovieGenres } from "@/utils/tmdb-api";
import { MenuButton } from "../shared/menu-button";
import { FiltersContainer } from "./filters-container";
import { GenreFilter } from "./genre-filter";
import { GenreFilterButton } from "./genre-filter-button";
import { ResetFilter } from "./reset-filter";
import { SortFilter } from "./sort-filter";

interface FiltersProps {
  locale: SupportedLocale;
  mobileButtonLabel: string;
}

export async function Filters({ locale, mobileButtonLabel }: FiltersProps) {
  const { genres } = await fetchMovieGenres({ language: locale });

  return (
    <FiltersContainer
      desktopChildren={
        <>
          <GenreFilterButton allGenres={genres} />
          <SortFilter hideLabel />
          <ResetFilter hideLabel />
        </>
      }
      mobileChildren={
        <MenuButton
          menuContent={
            <div css={styles.mobileMenuContent}>
              <SortFilter bright />
              <GenreFilter allGenres={genres} />
              <ResetFilter bright />
            </div>
          }
          buttonProps={{
            icon: (
              <span css={styles.mobileIcon}>
                <Funnel weight="bold" role="presentation" />
              </span>
            ),
            type: "button",
            isActive: true,
          }}
          position="topRight"
        >
          {mobileButtonLabel}
        </MenuButton>
      }
    />
  );
}

const styles = stylex.create({
  desktopMenuContent: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: space._4,
    padding: controlSize._3,
    maxHeight: `calc(100dvh - 5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
  },

  mobileIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileMenuContent: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: space._4,
    padding: space._2,
    width: `calc(100dvw - (${space._3} * 2))`,
    maxHeight: `calc(100dvh - 5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
  },
});
