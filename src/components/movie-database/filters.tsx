import type { SupportedLocale } from "@/types";
import { FixedContainerContent } from "../shared/fixed-container-content";
import { FiltersContainer } from "./filters-container";
import { GenreFilter } from "./genre-filter";
import { GenreFilterButton } from "./genre-filter-button";
import { MediaTypeToggle } from "./media-type-toggle";
import { MobileFiltersButton } from "./mobile-filters-button";
import { ResetFilter } from "./reset-filter";
import { SearchButton } from "./search-button";
import { SortFilter } from "./sort-filter";
import { TmdbCredit } from "./tmdb-credit";

interface FiltersProps {
  locale: SupportedLocale;
  mobileButtonLabel: string;
}

export function Filters({ locale, mobileButtonLabel }: FiltersProps) {
  return (
    <FiltersContainer
      desktopChildren={
        <>
          <FixedContainerContent>
            <MediaTypeToggle />
          </FixedContainerContent>
          <GenreFilterButton />
          <FixedContainerContent className="flex gap-1">
            <SortFilter hideLabel />
            <ResetFilter hideLabel />
          </FixedContainerContent>
          <FixedContainerContent>
            <SearchButton />
          </FixedContainerContent>
          <TmdbCredit locale={locale} position="topLeft" />
        </>
      }
      mobileChildren={
        <>
          <MediaTypeToggle mobile />
          <div className="flex gap-1">
            <FixedContainerContent>
              <SearchButton />
            </FixedContainerContent>
            <TmdbCredit locale={locale} position="viewportWidth" />
            <MobileFiltersButton
              menuContent={
                <div className="flex items-center flex-wrap gap-4 p-2 w-[calc(100dvw-24px)] max-h-[calc(100dvh-80px-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1em-8px-4px-12px)] overflow-auto will-change-transform">
                  <SortFilter bright />
                  <GenreFilter />
                  <ResetFilter bright />
                </div>
              }
            >
              {mobileButtonLabel}
            </MobileFiltersButton>
          </div>
        </>
      }
    />
  );
}
