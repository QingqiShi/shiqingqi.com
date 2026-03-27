import * as stylex from "@stylexjs/stylex";

export const grid = stylex.create({
  base: { display: "grid" },
  inline: { display: "inline-grid" },
});

export const place = stylex.create({
  center: { placeItems: "center" },
  start: { placeItems: "start" },
});
