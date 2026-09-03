import * as stylex from "@stylexjs/stylex";

export const tableTokens = stylex.defineVars({
  // `position` takes no `var()`, so `Table` switches this token instead of
  // position; `auto` leaves the head in flow.
  headInset: "auto",
  // Painted behind the head only while it sticks, so rows scrolling under it do
  // not show through.
  headBackground: "transparent",
});
