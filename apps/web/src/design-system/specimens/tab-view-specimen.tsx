import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

const RAIL_ITEMS = 4;
const BAR_ITEMS = 3;

/**
 * A miniature page rather than the component: the real `TabView` owns the
 * screen and the `<main>` landmark. The diagram shows its two forms side by
 * side — a wide page with the sunken rail, its current destination raised,
 * and a phone with the floating tab bar.
 */
export function TabViewSpecimen() {
  return (
    <div css={styles.stage}>
      <div css={[wireframe.page, wireframe.clip, styles.wide]}>
        <div css={styles.rail}>
          <span css={[corner.radius_1, styles.mark]} />
          {Array.from({ length: RAIL_ITEMS }, (_, index) => (
            <span
              key={index}
              css={[
                corner.radius_1,
                styles.railItem,
                index === 0 && styles.current,
              ]}
            />
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
  rail: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    gap: rhythm.inline,
    inlineSize: "1.25rem",
    paddingBlock: space._1,
    borderInlineEndWidth: border.size_1,
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.border,
    backgroundColor: color.bgControlSunken,
  },
  mark: {
    inlineSize: space._2,
    blockSize: space._2,
    marginBlockEnd: rhythm.inline,
    backgroundColor: color.fgMuted,
  },
  railItem: {
    inlineSize: space._2,
    blockSize: space._2,
    backgroundColor: color.bgNeutral,
  },
  current: {
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: color.bgControlRaised,
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
    backgroundColor: color.bgSurfaceRaised,
  },
  barItem: {
    inlineSize: space._3,
    blockSize: space._2,
    backgroundColor: color.border,
  },
  barCurrent: {
    backgroundColor: color.bgControlSelected,
  },
});
