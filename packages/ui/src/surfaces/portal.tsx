"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  EffectCarrierContext,
  EffectContainedContext,
} from "../effect-layer/effect-carrier-context.ts";
import { VIEWPORT_CARRIER } from "../effect-layer/resolve-carrier.ts";
import { useIsHydrated } from "../hooks/use-is-hydrated.ts";
import { viewportAnchor } from "../primitives/layout.stylex.ts";
import type { StyleProp } from "../types.ts";

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
  /** StyleX styles for the anchor box around the children in the body. */
  anchorCss?: StyleProp;
}

/**
 * Portals its children to `target` from the first client render after
 * hydration. The server renders nothing, so the first client pass agrees
 * with it. The children are fixed to the viewport: a viewport anchor holds
 * them, or they are fixed themselves. Thus, their effect hooks are on the
 * viewport, also when the portal is inside a box that holds its fixed
 * descendants.
 *
 * @internal
 */
export function Portal({
  children,
  target,
  anchored = false,
  anchorCss,
}: PortalProps) {
  const isHydrated = useIsHydrated();
  if (!isHydrated || target === null) return null;
  const onViewport = (
    <EffectContainedContext value={false}>
      <EffectCarrierContext value={VIEWPORT_CARRIER}>
        {children}
      </EffectCarrierContext>
    </EffectContainedContext>
  );
  if (target !== undefined) return createPortal(onViewport, target);
  return createPortal(
    anchored ? (
      <div css={[viewportAnchor.fixed, anchorCss]}>{onViewport}</div>
    ) : (
      onViewport
    ),
    document.body,
  );
}
