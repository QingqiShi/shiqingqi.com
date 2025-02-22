import * as stylex from "@stylexjs/stylex";
import { controlSize } from "@/tokens.stylex";
import { Skeleton } from "../shared/skeleton";
import { skeletonTokens } from "../shared/skeleton.stylex";
import { FiltersContainer } from "./filters-container";

export function FiltersSkeleton() {
  return (
    <FiltersContainer
      desktopChildren={
        <>
          <Skeleton css={styles.genreButton} width={70} />
          <Skeleton css={styles.genreButton} width={160} />
        </>
      }
      mobileChildren={<Skeleton css={styles.genreButton} width={70} />}
    />
  );
}

const styles = stylex.create({
  genreButton: {
    [skeletonTokens.height]: controlSize._9,
  },
});
