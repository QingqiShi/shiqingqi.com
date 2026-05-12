import * as stylex from "@stylexjs/stylex";

// Button/input reset — removes browser defaults
export const buttonReset = stylex.create({
  base: {
    appearance: "none",
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    padding: 0,
    cursor: "pointer",
  },
});
