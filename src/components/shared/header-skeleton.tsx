import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { controlSize, layer, space } from "@/tokens.stylex";
import { Skeleton } from "./skeleton";
import { skeletonTokens } from "./skeleton.stylex";

export function HeaderSkeleton() {
  return (
    <div css={styles.container}>
      <div css={styles.nav}>
        <div />
        <div css={styles.navContent}>
          <Skeleton css={styles.localeButton} width={120} />
        </div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: {
    position: "fixed",
    top: 0,
    right: 0,
    left: 0,
    height: "5rem",
    zIndex: layer.header,
    pointerEvents: "none",
    viewTransitionName: "header",
  },
  nav: {
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    height: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "none",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  navContent: {
    pointerEvents: "all",
    display: "flex",
    alignItems: "center",
    gap: space._1,
  },
  localeButton: {
    [skeletonTokens.height]: controlSize._9,
  },
});
