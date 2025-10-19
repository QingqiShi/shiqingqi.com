import * as stylex from "@stylexjs/stylex";
import { controlSize, layer, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
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
          <Skeleton css={styles.control} width={widths.desktopSearch} />
          <Skeleton css={styles.control} width={widths.desktopInfo} />
        </>
      }
      mobileChildren={
        <>
          <Skeleton
            css={[styles.control, styles.mobileMediaTypeToggle]}
            width={widths.mobileMediaType}
          />
          <div css={styles.content}>
            <Skeleton css={styles.control} width={widths.mobileSearch} />
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

const styles = stylex.create({
  control: {
    [skeletonTokens.height]: controlSize._9,
  },
  content: {
    display: "flex",
    gap: space._1,
  },
  mobileMediaTypeToggle: {
    position: "fixed",
    bottom: `calc(${space._2} + env(safe-area-inset-bottom))`,
    left: `calc(50% - var(--removed-body-scroll-bar-size, 0px) / 2)`,
    transform: "translateX(-50%)",
    zIndex: layer.overlay,
    willChange: "transform",
  },
});
