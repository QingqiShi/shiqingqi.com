import * as stylex from "@stylexjs/stylex";

// Position + inset fills
export const absoluteFill = stylex.create({
  all: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  x: { position: "absolute", left: 0, right: 0 },
  y: { position: "absolute", top: 0, bottom: 0 },
});

export const fixedFill = stylex.create({
  all: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

// Scroll containers — overflow + scrollbar behavior
export const scrollX = stylex.create({
  base: {
    overflowX: "auto",
    scrollbarWidth: "none",
  },
});

export const scrollY = stylex.create({
  base: {
    overflowY: "auto",
  },
});

// Text truncation — the 3-property recipe
export const truncate = stylex.create({
  base: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

// Image sizing — objectFit + dimensions
export const imageCover = stylex.create({
  base: {
    objectFit: "cover",
    width: "100%",
    height: "100%",
  },
});

export const imageContain = stylex.create({
  base: {
    objectFit: "contain",
    width: "100%",
    height: "100%",
  },
});
