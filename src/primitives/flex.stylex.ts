import * as stylex from "@stylexjs/stylex";

// Multi-property layout primitives — common flex patterns
export const flex = stylex.create({
  row: { display: "flex", alignItems: "center" },
  col: { display: "flex", flexDirection: "column" },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  between: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wrap: { display: "flex", flexWrap: "wrap", alignItems: "center" },
  inlineCenter: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
});

// Single-property layout modifiers — override defaults from flex primitives
export const align = stylex.create({
  start: { alignItems: "flex-start" },
  center: { alignItems: "center" },
  end: { alignItems: "flex-end" },
  baseline: { alignItems: "baseline" },
  stretch: { alignItems: "stretch" },
});

export const justify = stylex.create({
  start: { justifyContent: "flex-start" },
  center: { justifyContent: "center" },
  end: { justifyContent: "flex-end" },
  between: { justifyContent: "space-between" },
});

export const grow = stylex.create({
  _0: { flexGrow: 0 },
  _1: { flexGrow: 1 },
});

export const shrink = stylex.create({
  _0: { flexShrink: 0 },
  _1: { flexShrink: 1 },
});
