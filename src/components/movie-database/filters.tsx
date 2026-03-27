import * as stylex from "@stylexjs/stylex";
import { flex } from "#src/primitives/flex.stylex.ts";
import { controlSize, space } from "#src/tokens.stylex.ts";
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
  mobileButtonLabel: string;
}

export function Filters({ mobileButtonLabel }: FiltersProps) {
  return (
    <FiltersContainer
      desktopChildren={
        <>
          <FixedContainerContent>
            <MediaTypeToggle />
          </FixedContainerContent>
          <GenreFilterButton />
          <FixedContainerContent css={styles.content}>
            <SortFilter hideLabel />
            <ResetFilter hideLabel />
          </FixedContainerContent>
          <FixedContainerContent>
            <SearchButton />
          </FixedContainerContent>
          <TmdbCredit position="topLeft" />
        </>
      }
      mobileChildren={
        <>
          <MediaTypeToggle mobile />
          <div css={styles.content}>
            <FixedContainerContent>
              <SearchButton />
            </FixedContainerContent>
            <TmdbCredit position="viewportWidth" />
            <MobileFiltersButton
              menuContent={
                <div css={[flex.wrap, styles.mobileMenuContent]}>
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

const styles = stylex.create({
  mobileMenuContent: {
    gap: space._4,
    padding: space._2,
    width: `calc(100dvw - (${space._3} * 2))`,
    maxHeight: `calc(100dvh - ${space._10} - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1em - ${controlSize._2} - ${controlSize._1} - ${space._3})`,
    overflow: "auto",
    willChange: "transform",
  },
  content: {
    display: "flex",
    gap: space._1,
  },
});
