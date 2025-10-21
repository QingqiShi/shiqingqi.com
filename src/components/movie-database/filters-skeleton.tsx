import type { SupportedLocale } from "@/types";
import { Skeleton } from "../shared/skeleton";
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
          <Skeleton className="h-9" width={widths.desktopMediaType} />
          <Skeleton className="h-9" width={widths.desktopGenre} />
          <Skeleton className="h-9" width={widths.desktopSort} />
          <Skeleton className="h-9" width={widths.desktopSearch} />
          <Skeleton className="h-9" width={widths.desktopInfo} />
        </>
      }
      mobileChildren={
        <>
          <Skeleton
            className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-[calc(50%-var(--removed-body-scroll-bar-size,0px)/2)] -translate-x-1/2 z-overlay will-change-transform h-9"
            width={widths.mobileMediaType}
          />
          <div className="flex gap-1">
            <Skeleton className="h-9" width={widths.mobileSearch} />
            <Skeleton className="h-9" width={widths.mobileInfo} />
            <Skeleton className="h-9" width={widths.mobileFilters} />
          </div>
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
    desktopSearch: 117,
    desktopInfo: 40,
    mobileMediaType: 165,
    mobileSearch: 48,
    mobileInfo: 48,
    mobileFilters: 110,
  },
  zh: {
    desktopMediaType: 140,
    desktopGenre: 76,
    desktopSort: 142,
    desktopSearch: 96,
    desktopInfo: 40,
    mobileMediaType: 149,
    mobileSearch: 48,
    mobileInfo: 48,
    mobileFilters: 91,
  },
};
