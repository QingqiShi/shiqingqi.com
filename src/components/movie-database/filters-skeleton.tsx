import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { controlSize, space } from "@/tokens.stylex";
import { Skeleton } from "../shared/skeleton";
import { skeletonTokens } from "../shared/skeleton.stylex";

export function FiltersSkeleton() {
  return (
    <div css={styles.container}>
      <Skeleton css={styles.genreButton} width={70} />
    </div>
  );
}

const styles = stylex.create({
  container: {
    marginTop: "5rem",
    marginInline: "auto",
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    paddingBottom: space._2,
  },
  genreButton: {
    [skeletonTokens.height]: controlSize._9,
  },
});
