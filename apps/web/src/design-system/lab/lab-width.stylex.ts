import * as stylex from "@stylexjs/stylex";

/**
 * The forms of a Lab, by the width of its size container `lab`, not of the
 * screen: the sidebar beside the page takes room that the screen width does
 * not show. From 50rem the controls panel stands beside the stage. That is
 * the panel, the gap, and a stage of 30rem, so the stage there is never as
 * narrow as a phone. Below it, the bar at the foot of the viewport carries
 * the controls and the stage keeps the whole width.
 */
export const labWidth = stylex.defineConsts({
  panelBeside: "@container lab (width >= 50rem)",
});
