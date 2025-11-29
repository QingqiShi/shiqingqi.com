import * as stylex from "@stylexjs/stylex";
import { controlSize, layer, space } from "#src/tokens.stylex.ts";
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
    height: space._10,
    zIndex: layer.header,
    pointerEvents: "none",
    paddingRight: "var(--removed-body-scroll-bar-size, 0px)",
  },
  nav: {
    maxInlineSize: "1140px",
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
