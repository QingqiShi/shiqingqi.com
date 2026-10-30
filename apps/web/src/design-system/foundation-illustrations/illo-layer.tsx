"use client";

import * as stylex from "@stylexjs/stylex";
import { useReducedMotion } from "@tuja/ui/motion/use-reduced-motion";
import { type ReactNode, useEffect, useRef } from "react";
import { illoVars } from "./illustration.stylex.ts";

/**
 * While the card is hovered, writes the pointer position over the enclosing
 * tile to `illoVars.px/py` (0 -> 1 across the tile, 0.5 = centre); the
 * illustrations read the derived, centred `illoVars.mx/my` to lean towards the
 * cursor. Skipped under reduced motion — the illustration still blooms to
 * colour, just without the lean.
 */
export function IlloLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const layer = ref.current;
    const tile = layer?.closest("[data-illo-tile]");
    if (!layer || !(tile instanceof HTMLElement)) {
      return;
    }

    // Write the inline values of the `pointer` style directly, so a pointer
    // move does not cause a React render.
    const writePointer = (px: string, py: string) => {
      const { style } = stylex.props(styles.pointer(px, py));
      for (const [property, value] of Object.entries(style ?? {})) {
        layer.style.setProperty(property, String(value));
      }
    };

    // Coalesce pointer-move to one write per frame: store the latest position
    // and flush it inside rAF so a busy pointer never outruns the compositor.
    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      frame = 0;
      if (!pending) {
        return;
      }
      const rect = tile.getBoundingClientRect();
      const px = clamp01((pending.x - rect.left) / rect.width);
      const py = clamp01((pending.y - rect.top) / rect.height);
      writePointer(px.toFixed(4), py.toFixed(4));
    };

    const handleMove = (event: PointerEvent) => {
      pending = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const recentre = () => {
      pending = null;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      writePointer(CENTRE, CENTRE);
    };

    if (prefersReducedMotion) {
      recentre();
      return;
    }
    tile.addEventListener("pointermove", handleMove);
    tile.addEventListener("pointerleave", recentre);

    return () => {
      tile.removeEventListener("pointermove", handleMove);
      tile.removeEventListener("pointerleave", recentre);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [prefersReducedMotion]);

  return (
    <span ref={ref} css={[styles.illoLayer, styles.pointer(CENTRE, CENTRE)]}>
      {children}
    </span>
  );
}

const CENTRE = "0.5";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

const styles = stylex.create({
  // The mask fades the illustration out across the text band so copy never fights it.
  illoLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    // The illustration is cut to the tile's corner here rather than by the
    // tile, which cannot clip: a squircle-cornered clip above a Scroll mask or
    // a Progressive blur makes Chrome drop their masks, and the tiles host both.
    // The layer is the tile's own child, so it inherits that corner rather than
    // restating the token, and the two can never drift apart.
    overflow: "hidden",
    borderRadius: "inherit",
    cornerShape: "inherit",
    [illoVars.mx]: `calc((${illoVars.px} - 0.5) * 2)`,
    [illoVars.my]: `calc((${illoVars.py} - 0.5) * 2)`,
    maskImage:
      "radial-gradient(125% 140% at 100% 100%, #000 44%, rgba(0, 0, 0, 0.5) 66%, transparent 85%)",
    WebkitMaskImage:
      "radial-gradient(125% 140% at 100% 100%, #000 44%, rgba(0, 0, 0, 0.5) 66%, transparent 85%)",
  },
  pointer: (px: string, py: string) => ({
    [illoVars.px]: px,
    [illoVars.py]: py,
  }),
});
