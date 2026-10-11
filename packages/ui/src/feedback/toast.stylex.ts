import * as stylex from "@stylexjs/stylex";

/**
 * The dial of `ToastProvider`. Override it the way `cornerTokens.height` is
 * overridden: in a local `stylex.create` block passed to the provider's
 * `css`, or on any ancestor of its portal target.
 */
export const toastTokens = stylex.defineVars({
  /**
   * The height of the app chrome along the bottom of the viewport that the
   * toast must clear, safe area included: the safe area by default. The
   * provider adds its own gap above it, so the value holds no gap.
   */
  clearance: "env(safe-area-inset-bottom, 0px)",
});
