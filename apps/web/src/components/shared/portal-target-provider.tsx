"use client";

import * as stylex from "@stylexjs/stylex";
import { viewportAnchor } from "@tuja/ui/primitives/layout.stylex";
import { layer } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";
import { PORTAL_TARGET_ID } from "#src/constants/portal-target-id.ts";
import { PortalContext } from "#src/contexts/portal-context.tsx";

/**
 * A provider component that renders the page's portal target and makes it
 * available through context to child components.
 *
 * The target is a `viewportAnchor.fixed` box, so every overlay it hosts brings
 * its own viewport size.
 *
 * The anchor is also a compositing layer of its own, which fixes a Safari bug
 * with view transitions: without it, an overlay opening on a scrolled page has
 * its animation cut off in proportion to the scroll position.
 *
 * It has `pointerEvents: "none"` so it doesn't interfere with user
 * interactions; portal content handles its own pointer events.
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
      <div
        id={PORTAL_TARGET_ID}
        ref={setPortalTarget}
        css={[viewportAnchor.fixed, styles.anchor]}
      />
    </PortalContext>
  );
}

const styles = stylex.create({
  anchor: {
    pointerEvents: "none",
    // Everything hosted here is an overlay, and the overlay plane already
    // clears the site header and the sidebar rail — so the target sits on that
    // plane rather than borrowing the tooltip one above it.
    zIndex: layer.overlay,
    willChange: "transform",
  },
});
