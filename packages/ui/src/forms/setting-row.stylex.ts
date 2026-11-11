import * as stylex from "@stylexjs/stylex";

/**
 * How a `SettingRow` sits among its siblings. A `SettingList` sets them, so
 * that its rows pad themselves and draw a divider between them. A row alone
 * has neither.
 *
 * @internal
 */
export const settingRowTokens = stylex.defineVars({
  divider: "0px",
  paddingBlock: "0px",
});
