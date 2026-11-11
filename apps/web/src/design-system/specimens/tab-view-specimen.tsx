import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

const SIDEBAR_ITEMS = 4;
const BAR_ITEMS = 3;

/**
 * A miniature page rather than the component: the real `TabView` owns the
 * screen and the `<main>` landmark. The diagram shows two of its forms side
 * by side: a wide page with the labelled sidebar, its current destination
 * marked, and a phone with the floating tab bar.
 */
export function TabViewSpecimen() {
  return (
    <div css={styles.stage}>
      <div css={[wireframe.page, wireframe.clip, styles.wide]}>
        <div css={styles.sidebar}>
          <span css={[corner.radius_1, styles.mark]} />
          {Array.from({ length: SIDEBAR_ITEMS }, (_, index) => (
            <span
              key={index}
              css={[
                corner.radius_1,
                styles.sidebarItem,
                index === 0 && styles.current,
              ]}
            >
              <span css={[corner.radius_1, styles.icon]} />
              <WireframeBar width="60%" />
            </span>
          ))}
        </div>
        <div css={styles.content}>
          <WireframeBar width="50%" strong />
          <WireframeBar width="80%" />
          <WireframeBar width="65%" />
        </div>
      </div>
      <div css={[wireframe.page, wireframe.clip, styles.phone]}>
        <div css={styles.content}>
          <WireframeBar width="70%" strong />
          <WireframeBar width="90%" />
        </div>
        <div css={[corner.radius_round, styles.bar]}>
          {Array.from({ length: BAR_ITEMS }, (_, index) => (
            <span
              key={index}
              css={[
                corner.radius_round,
                styles.barItem,
                index === 0 && styles.barCurrent,
              ]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  stage: {
    display: "flex",
    alignItems: "stretch",
    gap: rhythm.tight,
    inlineSize: "100%",
    blockSize: "100%",
  },
  wide: {
    flexDirection: "row",
    flexGrow: 1,
  },
  phone: {
    flexShrink: 0,
    inlineSize: "28%",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    gap: rhythm.inline,
    inlineSize: "40%",
    paddingBlock: space._1,
    paddingInline: space._0,
    borderInlineEndWidth: border.size_1,
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.border,
  },
  mark: {
    inlineSize: space._2,
    blockSize: space._2,
    marginBlockEnd: rhythm.inline,
    backgroundColor: color.mutedForeground,
  },
  sidebarItem: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    padding: space._00,
  },
  icon: {
    flexShrink: 0,
    inlineSize: space._1,
    blockSize: space._1,
    backgroundColor: color.input,
  },
  current: {
    backgroundColor: color.secondary,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: rhythm.tight,
    padding: space._1,
  },
  bar: {
    display: "flex",
    justifyContent: "space-around",
    marginInline: rhythm.inline,
    marginBlockEnd: rhythm.inline,
    padding: space._00,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.popover,
  },
  barItem: {
    inlineSize: space._3,
    blockSize: space._2,
    backgroundColor: color.border,
  },
  barCurrent: {
    backgroundColor: color.secondary,
  },
});
