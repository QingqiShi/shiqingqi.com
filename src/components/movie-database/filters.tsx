"use client";

import * as stylex from "@stylexjs/stylex";
import { controlSize, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { FiltersContainer } from "./filters-container";
import { GenreFilter } from "./genre-filter";
import { GenreFilterButton } from "./genre-filter-button";
import { MediaTypeToggle } from "./media-type-toggle";
import { MobileFiltersButton } from "./mobile-filters-button";
import { ResetFilter } from "./reset-filter";
import { SearchButton, SearchDialogProvider } from "./search-button";
import { SortFilter } from "./sort-filter";
import { TmdbCredit } from "./tmdb-credit";

interface FiltersProps {
  locale: SupportedLocale;
  mobileButtonLabel: string;
}

export function Filters({ locale, mobileButtonLabel }: FiltersProps) {
  return (
    <SearchDialogProvider>
      <FiltersContainer
        desktopChildren={
          <>
            <MediaTypeToggle />
            <GenreFilterButton />
            <SortFilter hideLabel />
            <ResetFilter hideLabel />
            <SearchButton />
            <TmdbCredit locale={locale} position="topLeft" />
          </>
        }
        mobileChildren={
          <>
            <MediaTypeToggle mobile />
            <SearchButton />
            <TmdbCredit locale={locale} position="viewportWidth" />
            <MobileFiltersButton
              menuContent={
                <div css={styles.mobileMenuContent}>
                  <SortFilter bright />
                  <GenreFilter />
                  <ResetFilter bright />
                </div>
              }
            >
              {mobileButtonLabel}
            </MobileFiltersButton>
          </>
        }
      />
    </SearchDialogProvider>
  );
}

const styles = stylex.create({
  mobileMenuContent: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: space._4,
    padding: space._2,
    width: `calc(100dvw - (${space._3} * 2))`,
    maxHeight: `calc(100dvh - ${space._10} - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
  },
});
