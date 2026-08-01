import * as stylex from "@stylexjs/stylex";

export const tableTokens = stylex.defineVars({
  // Where the head sticks. The head is always `position: sticky` — `position`
  // takes no `var()` — so `Table` switches this instead, and `auto` leaves the
  // head in the flow.
  headInset: "auto",
  // Painted behind the head only while it sticks, so rows scrolling under it do
  // not show through.
  headBackground: "transparent",
});
