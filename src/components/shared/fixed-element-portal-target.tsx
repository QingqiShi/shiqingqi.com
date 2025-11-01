"use client";

import * as stylex from "@stylexjs/stylex";
import { useState, type ReactNode } from "react";
import { PORTAL_TARGET_ID } from "#src/constants/portal.ts";
import { PortalContext } from "#src/contexts/portal-context.tsx";
import { layer } from "#src/tokens.stylex.ts";

/**
 * A provider component that renders a fixed portal target element and makes it
 * available through context to child components.
 *
 * This component creates a separate stacking context for portal elements during
 * view transitions. The portal target spans the entire viewport and uses
 * `transform: translate3d(0, 0, 0)` to create a new compositing layer.
 *
 * **Safari Bug Fix:**
 * This specifically addresses a Safari issue where fixed-position elements
 * cause positioning problems during view transitions. When the overlay opens on a
 * scrolled page, the animation would get cut off proportionally to the scroll
 * position. By creating this separate compositing layer, we ensure animations play
 * correctly regardless of scroll position.
 *
 * The portal target has `pointerEvents: "none"` so it doesn't interfere with user
 * interactions - portal content should handle their own pointer events.
 *
 * @example
 * ```tsx
 * <PortalTargetProvider>
 *   <App />
 * </PortalTargetProvider>
 * ```
 */
export function PortalTargetProvider({ children }: { children: ReactNode }) {
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);

  return (
    <PortalContext value={{ portalTarget }}>
      {children}
      <div id={PORTAL_TARGET_ID} ref={setPortalTarget} css={styles.container} />
    </PortalContext>
  );
}

const styles = stylex.create({
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100dvh",
    pointerEvents: "none",
    zIndex: layer.tooltip,
    willChange: "transform",
  },
});
