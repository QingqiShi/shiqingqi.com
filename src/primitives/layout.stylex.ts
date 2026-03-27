import * as stylex from "@stylexjs/stylex";
import { layer } from "#src/tokens.stylex.ts";

export const position = stylex.create({
  relative: { position: "relative" },
  absolute: { position: "absolute" },
  fixed: { position: "fixed" },
  sticky: { position: "sticky" },
});

export const overflow = stylex.create({
  hidden: { overflow: "hidden" },
  auto: { overflow: "auto" },
  visible: { overflow: "visible" },
});

export const z = stylex.create({
  background: { zIndex: layer.background },
  base: { zIndex: layer.base },
  content: { zIndex: layer.content },
  overlay: { zIndex: layer.overlay },
  header: { zIndex: layer.header },
  tooltip: { zIndex: layer.tooltip },
  toaster: { zIndex: layer.toaster },
});

export const size = stylex.create({
  full: { width: "100%", height: "100%" },
  fullWidth: { width: "100%" },
  fullHeight: { height: "100%" },
});

export const inset = stylex.create({
  _0: { top: 0, right: 0, bottom: 0, left: 0 },
});

export const pointer = stylex.create({
  none: { pointerEvents: "none" },
  all: { pointerEvents: "all" },
});
