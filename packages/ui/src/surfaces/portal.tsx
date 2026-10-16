"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsHydrated } from "../hooks/use-is-hydrated.ts";
import { viewportAnchor } from "../primitives/layout.stylex.ts";

interface PortalProps {
  children: ReactNode;
  /**
   * Where the children portal to. `undefined` is `document.body`. `null`
   * renders nothing until the caller has a target. An element takes the
   * children as they are, so it must already be a viewport anchor.
   */
  target: Element | DocumentFragment | null | undefined;
  /**
   * Wraps the children in a `viewportAnchor.fixed` box when they portal to
   * `document.body`, which is not a viewport anchor.
   */
  anchored?: boolean;
}

/**
 * Portals its children to `target` from the first client render after
 * hydration. The server renders nothing, so the first client pass agrees
 * with it.
 *
 * @internal
 */
export function Portal({ children, target, anchored = false }: PortalProps) {
  const isHydrated = useIsHydrated();
  if (!isHydrated || target === null) return null;
  if (target !== undefined) return createPortal(children, target);
  return createPortal(
    anchored ? <div css={viewportAnchor.fixed}>{children}</div> : children,
    document.body,
  );
}
