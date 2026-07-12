import * as stylex from "@stylexjs/stylex";
import { border, color, controlSize, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";

export function ControlSizeShowcase() {
  // Control-size ramp: each square is drawn at its token, which itself shrinks at
  // the md breakpoint — so the whole ramp steps down live as the window widens.
  const controls = [
    { token: "controlSize._0", meta: "2.4 → 2px", swatch: styles.cs0 },
    { token: "controlSize._1", meta: "4.8 → 4px", swatch: styles.cs1 },
    { token: "controlSize._2", meta: "9.6 → 8px", swatch: styles.cs2 },
    { token: "controlSize._3", meta: "14.4 → 12px", swatch: styles.cs3 },
    { token: "controlSize._4", meta: "19.2 → 16px", swatch: styles.cs4 },
    { token: "controlSize._5", meta: "24 → 20px", swatch: styles.cs5 },
    { token: "controlSize._6", meta: "28.8 → 24px", swatch: styles.cs6 },
    { token: "controlSize._7", meta: "33.6 → 28px", swatch: styles.cs7 },
    { token: "controlSize._8", meta: "38.4 → 32px", swatch: styles.cs8 },
    { token: "controlSize._9", meta: "48 → 40px", swatch: styles.cs9 },
    { token: "controlSize._10", meta: "57.6 → 48px", swatch: styles.cs10 },
  ];

  return (
    <Showcase label={t({ en: "Control size", zh: "控件尺寸" })}>
      <ShowcaseHelper>
        {t({
          en: "The dimension ramp for controls — heights, paddings, icon boxes. Every step renders larger on touch viewports and shrinks at the md breakpoint, so tap targets stay comfortable on phones.",
          zh: "控件的尺寸阶梯——高度、内边距、图标盒。每一级在触摸视口上更大，并在 md 断点收缩，从而在手机上保持舒适的点按目标。",
        })}
      </ShowcaseHelper>
      <div css={styles.grid}>
        {controls.map((step) => (
          <SpecCard key={step.token} token={step.token} meta={step.meta}>
            <div css={styles.csFloor}>
              <span css={[styles.csSwatch, step.swatch]} />
            </div>
          </SpecCard>
        ))}
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: space._3,
  },
  csFloor: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "56px",
  },
  csSwatch: {
    borderRadius: border.radius_1,
    backgroundColor: color.accent,
  },
  cs0: { inlineSize: controlSize._0, blockSize: controlSize._0 },
  cs1: { inlineSize: controlSize._1, blockSize: controlSize._1 },
  cs2: { inlineSize: controlSize._2, blockSize: controlSize._2 },
  cs3: { inlineSize: controlSize._3, blockSize: controlSize._3 },
  cs4: { inlineSize: controlSize._4, blockSize: controlSize._4 },
  cs5: { inlineSize: controlSize._5, blockSize: controlSize._5 },
  cs6: { inlineSize: controlSize._6, blockSize: controlSize._6 },
  cs7: { inlineSize: controlSize._7, blockSize: controlSize._7 },
  cs8: { inlineSize: controlSize._8, blockSize: controlSize._8 },
  cs9: { inlineSize: controlSize._9, blockSize: controlSize._9 },
  cs10: { inlineSize: controlSize._10, blockSize: controlSize._10 },
});
