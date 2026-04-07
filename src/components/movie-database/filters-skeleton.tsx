import * as stylex from "@stylexjs/stylex";
import { controlSize, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { Skeleton } from "../shared/skeleton";
import { skeletonTokens } from "../shared/skeleton.stylex";
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
          <div css={styles.content}>
            <Skeleton css={styles.control} width={widths.mobileInfo} />
            <Skeleton css={styles.control} width={widths.mobileFilters} />
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
    desktopInfo: 40,
    mobileMediaType: 165,
    mobileInfo: 48,
    mobileFilters: 110,
  },
  zh: {
    desktopMediaType: 140,
    desktopGenre: 76,
    desktopSort: 142,
    desktopInfo: 40,
    mobileMediaType: 149,
    mobileInfo: 48,
    mobileFilters: 91,
  },
};

const styles = stylex.create({
  control: {
    [skeletonTokens.height]: controlSize._9,
  },
  content: {
    display: "flex",
    gap: space._1,
  },
});
