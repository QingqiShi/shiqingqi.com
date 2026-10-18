import * as stylex from "@stylexjs/stylex";

export const fullScreenCanvas = stylex.create({
  base: {
    // Lock to the large viewport (`100lvh`) so iOS Safari's URL-bar
    // collapse on scroll doesn't resize the canvas — a resize would fire
    // the ResizeObserver, recreate the FBOs, and flash the page white
    // between the buffer clear and the next render. iOS Safari's
    // `100lvh` excludes the Dynamic Island / home-indicator safe areas
    // even with `viewport-fit=cover`, so we negatively offset and grow
    // by the safe-area insets to cover the full screen — OS chrome just
    // overlays those extended regions.
    position: "fixed",
    top: "calc(-1 * env(safe-area-inset-top))",
    left: "calc(-1 * env(safe-area-inset-left))",
    width:
      "calc(100vw + env(safe-area-inset-left) + env(safe-area-inset-right))",
    height:
      "calc(100lvh + env(safe-area-inset-top) + env(safe-area-inset-bottom))",
    pointerEvents: "none",
  },
});
