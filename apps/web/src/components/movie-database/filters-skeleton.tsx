import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { skeletonTokens } from "@tuja/ui/components/skeleton.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import type { SupportedLocale } from "#src/types.ts";
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
          <Skeleton css={styles.control} width={widths.desktopMediaType} />
          <Skeleton css={styles.control} width={widths.desktopGenre} />
          <Skeleton css={styles.control} width={widths.desktopSort} />
          <Skeleton css={styles.control} width={widths.desktopInfo} />
        </>
      }
      mobileChildren={
        <>
          <Skeleton css={styles.control} width={widths.mobileMediaType} />
          <Skeleton css={styles.control} width={widths.mobileFilters} />
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
    desktopInfo: 40,
    mobileMediaType: 165,
    mobileFilters: 110,
  },
  zh: {
    desktopMediaType: 140,
    desktopGenre: 76,
    desktopSort: 142,
    desktopInfo: 40,
    mobileMediaType: 149,
    mobileFilters: 91,
  },
};

const styles = stylex.create({
  control: {
    [skeletonTokens.height]: controlSize._9,
  },
});
