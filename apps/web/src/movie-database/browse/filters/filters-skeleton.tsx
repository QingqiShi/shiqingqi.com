import type { SupportedLocale } from "@tuja/i18n/types";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { controlHeight } from "@tuja/ui/tokens.stylex";
import { FiltersContainer } from "./filters-container";

interface FiltersSkeletonProps {
  locale: SupportedLocale;
}

export function FiltersSkeleton({ locale }: FiltersSkeletonProps) {
  const widths = controlWidths[locale];

  return (
    <FiltersContainer
      desktopChildren={
        <>
          <Skeleton
            height={controlHeight.md}
            shape="control"
            width={widths.desktopMediaType}
          />
          <Skeleton
            height={controlHeight.md}
            shape="control"
            width={widths.desktopGenre}
          />
          <Skeleton
            height={controlHeight.md}
            shape="control"
            width={widths.desktopSort}
          />
          <Skeleton
            height={controlHeight.md}
            shape="control"
            width={widths.desktopView}
          />
          <Skeleton
            height={controlHeight.md}
            shape="control"
            width={widths.desktopInfo}
          />
        </>
      }
      mobileChildren={
        <>
          <Skeleton
            height={controlHeight.md}
            shape="control"
            width={widths.mobileMediaType}
          />
          <Skeleton
            height={controlHeight.md}
            shape="control"
            width={widths.mobileFilters}
          />
        </>
      }
    />
  );
}

const controlWidths = {
  en: {
    desktopMediaType: 194,
    desktopGenre: 90,
    desktopSort: 205,
    // The view toggle is icon-only, so it is the same width in both locales.
    desktopView: 92,
    desktopInfo: 40,
    mobileMediaType: 165,
    mobileFilters: 110,
  },
  zh: {
    desktopMediaType: 140,
    desktopGenre: 76,
    desktopSort: 142,
    desktopView: 92,
    desktopInfo: 40,
    mobileMediaType: 149,
    mobileFilters: 91,
  },
};
