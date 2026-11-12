import * as stylex from "@stylexjs/stylex";

const NARROW = "@container (width < 44rem)";

/**
 * Shows an element only at one side of 44rem, the width of the view it is
 * in. It is the design system's `hidden md:block` and `md:hidden`: give the
 * two forms of one content, such as a `Table` in a wide view and a `ListRow`
 * list in a narrow one, each to its own wrapper.
 *
 * ```tsx
 * <div css={show.wide}><Table … /></div>
 * <div css={show.narrow}><List … /></div>
 * ```
 *
 * It measures the nearest size container, not the screen. A
 * `NavigationSplitView` and a `NavigationStack` are each one, so in a
 * `TabView` the content changes form by the room that the sidebar leaves it.
 * Outside a size container, `wide` always shows while `narrow` never does:
 * the wide form stays, and it scrolls.
 *
 * Each member owns the element's `display`. Give it to a wrapper, not to an
 * element whose `display` is part of its layout, such as a flex row.
 */
export const show = stylex.create({
  /** Shows the element where its view is 44rem wide or wider. */
  wide: {
    display: { default: null, [NARROW]: "none" },
  },
  /**
   * Shows the element where its view is narrower than 44rem. There it takes
   * the `display` its element has by default.
   */
  narrow: {
    display: { default: "none", [NARROW]: "revert" },
  },
});
