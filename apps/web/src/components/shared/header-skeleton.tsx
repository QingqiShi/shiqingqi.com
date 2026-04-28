import * as stylex from "@stylexjs/stylex";
import { flex } from "#src/primitives/flex.stylex.ts";
import { controlSize, layer, layout, space } from "#src/tokens.stylex.ts";
import { Skeleton } from "./skeleton";
import { skeletonTokens } from "./skeleton.stylex";

export function HeaderSkeleton() {
  return (
    <div css={styles.container}>
      <div css={[flex.between, styles.nav]}>
        <div />
        <div css={[flex.row, styles.navContent]}>
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
    height: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingTop: "env(safe-area-inset-top)",
    zIndex: layer.header,
    pointerEvents: "none",
    paddingRight: "var(--removed-body-scroll-bar-size, 0px)",
  },
  nav: {
    maxInlineSize: layout.maxInlineSize,
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    height: "100%",
    pointerEvents: "none",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  navContent: {
    pointerEvents: "all",
    gap: space._1,
  },
  localeButton: {
    [skeletonTokens.height]: controlSize._9,
  },
});
