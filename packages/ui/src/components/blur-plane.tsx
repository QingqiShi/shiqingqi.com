"use client";

import * as stylex from "@stylexjs/stylex";
import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { layer } from "../tokens.stylex.ts";

interface BlurPlaneValue {
  node: HTMLElement | null;
  setNode: (node: HTMLElement | null) => void;
}

/**
 * The page's Blur plane, or `null` outside a shell that keeps one. A floating
 * control reads it to paint its blur there; `null` leaves the blur beside the
 * control's own element.
 *
 * Internal to the shells and `ProgressiveBlur` — not part of the package's
 * public API.
 *
 * @internal
 */
export const BlurPlaneContext = createContext<BlurPlaneValue | null>(null);

interface BlurPlaneProviderProps {
  children: ReactNode;
}

/**
 * Holds the page's Blur plane for the shell around it: the `BlurPlane` node
 * registers itself here, and every floating control under the provider paints
 * its own blur there.
 *
 * The node reaches the consumers as state rather than as a ref, because a
 * control that mounts before the plane has to render again once it lands.
 *
 * @internal
 */
export function BlurPlaneProvider({ children }: BlurPlaneProviderProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ node, setNode }), [node]);

  return <BlurPlaneContext value={value}>{children}</BlurPlaneContext>;
}

/**
 * The page's Blur plane: the one plane every floating control's progressive
 * blur is painted on, so no control's blur ever lands on another control.
 *
 * A shell renders it first inside its content element, at `layer.blur`: above
 * everything the page scrolls, and under the sticky chrome at `raised` and the
 * header at `header`, so every control on the page stays crisp over it.
 *
 * `SidebarLayout` keeps no plane, because it floats no group of controls over
 * the page it scrolls — its rail is beside the content and its mobile bar
 * carries a surface rather than a blur. A blur under that shell stays beside
 * its own element, which is where the only one it can meet belongs.
 *
 * It keeps no size of its own, so it is never the wide fixed box Safari on iOS
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
