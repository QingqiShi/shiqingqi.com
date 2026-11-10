import * as stylex from "@stylexjs/stylex";

/**
 * The width of the `TabView` around an element, at each side of
 * `breakpoints.md` (768px) and `breakpoints.lg` (1080px). From `md`, the
 * rail shows in place of the tab bar, and from `lg`, a view with
 * `rail="auto"` shows the labelled sidebar. The view measures its own width,
 * not the screen's, so a `TabView` in a frame, such as a demo, takes the form
 * that fits the frame, and content in it can follow. Outside a `TabView`, no
 * query holds.
 *
 * StyleX takes only static values here, so each width repeats the number of
 * its breakpoint. Change the two together.
 */
export const viewWidth = stylex.defineConsts({
  belowMd: "@container tab-view (width < 768px)",
  fromMd: "@container tab-view (width >= 768px)",
  belowLg: "@container tab-view (width < 1080px)",
  fromLg: "@container tab-view (width >= 1080px)",
});
