"use client";

import * as stylex from "@stylexjs/stylex";
import { use } from "react";
import { layer } from "../tokens.stylex.ts";
import { BlurPlaneContext, BlurPlaneProvider } from "./blur-plane-provider.tsx";

/** @internal */
export { BlurPlaneContext, BlurPlaneProvider };

/**
 * The page's Blur plane: the one plane every floating control's progressive
 * blur is painted on, so no control's blur ever lands on another control.
 *
 * Keeps no size of its own, so it is never the wide fixed box Safari on iOS
 * flattens — see "Progressive blur" in `CONTEXT.md`.
 *
 * @internal
 */
export function BlurPlane() {
  const setNode = use(BlurPlaneContext)?.setNode;

  return <div ref={setNode} aria-hidden="true" css={styles.plane} />;
}

const styles = stylex.create({
  plane: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: 0,
    blockSize: 0,
    pointerEvents: "none",
    zIndex: layer.blur,
  },
});
