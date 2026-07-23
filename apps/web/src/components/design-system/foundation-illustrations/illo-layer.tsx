"use client";

import * as stylex from "@stylexjs/stylex";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * Wraps a foundation-card illustration and, while the card is hovered, feeds the
 * pointer position into `--ds-illo-px` / `--ds-illo-py` — a 0 -> 1 fraction
 * across the card, 0.5 = centre (the rest position) — set on the enclosing tile
 * so the SVG descendants inherit them. The illustrations read these (via the
 * centred `--ds-illo-mx` / `--ds-illo-my`, -1 -> 1, derived below) to lean and
 * parallax toward the cursor instead of running a canned ambient loop.
 *
 * Pointer tracking is skipped under reduced motion; the art then just blooms
 * from monochrome to colour on hover with no positional response.
 */
export function IlloLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const layer = ref.current;
    // The interactive tile marks itself with `data-illo-tile` rather than us
    // assuming it is an <a>, so the coupling survives the tile changing element.
    const tile = layer?.closest("[data-illo-tile]");
    if (!(tile instanceof HTMLElement)) {
      return;
    }

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
      tile.style.setProperty("--ds-illo-px", px.toFixed(4));
      tile.style.setProperty("--ds-illo-py", py.toFixed(4));
    };

    const handleMove = (event: PointerEvent) => {
      pending = { x: event.clientX, y: event.clientY };
      frame ||= requestAnimationFrame(flush);
    };

    // Ease back to centre when the pointer leaves; the illustrations transition
    // their transforms, so this reads as the art settling rather than snapping.
    const recentre = () => {
      pending = null;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      tile.style.setProperty("--ds-illo-px", "0.5");
      tile.style.setProperty("--ds-illo-py", "0.5");
    };

    // Reduced-motion can be toggled mid-session, so bind tracking to the query
    // instead of reading it once: attach the listeners when motion is allowed,
    // detach and settle to centre when it is not. `matchMedia` is guarded for
    // environments that lack it (e.g. jsdom under test), matching sibling
    // components; there it resolves to null and motion stays enabled.
    const reduced =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const sync = () => {
      if (reduced?.matches) {
        tile.removeEventListener("pointermove", handleMove);
        tile.removeEventListener("pointerleave", recentre);
        recentre();
      } else {
        tile.addEventListener("pointermove", handleMove);
        tile.addEventListener("pointerleave", recentre);
      }
    };
    sync();
    reduced?.addEventListener("change", sync);

    return () => {
      reduced?.removeEventListener("change", sync);
      tile.removeEventListener("pointermove", handleMove);
      tile.removeEventListener("pointerleave", recentre);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <span ref={ref} css={styles.illoLayer}>
      {children}
    </span>
  );
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

const styles = stylex.create({
  // Sits behind the label + description, clipped to the card. The mask anchors
  // the art to the bottom-right corner and fades it hard across the text band so
  // copy never fights the illustration. The centred pointer handles derived here
  // (-1 = left/top .. 0 = centre .. 1 = right/bottom) are the values the
  // illustrations lean along; they resolve to 0 at rest via the 0.5 defaults.
  illoLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    "--ds-illo-mx": "calc((var(--ds-illo-px) - 0.5) * 2)",
    "--ds-illo-my": "calc((var(--ds-illo-py) - 0.5) * 2)",
    maskImage:
      "radial-gradient(125% 140% at 100% 100%, #000 44%, rgba(0, 0, 0, 0.5) 66%, transparent 85%)",
    WebkitMaskImage:
      "radial-gradient(125% 140% at 100% 100%, #000 44%, rgba(0, 0, 0, 0.5) 66%, transparent 85%)",
  },
});
