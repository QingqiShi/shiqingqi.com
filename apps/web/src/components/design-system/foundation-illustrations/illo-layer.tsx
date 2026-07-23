"use client";

import * as stylex from "@stylexjs/stylex";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * While the card is hovered, writes the pointer position to `--ds-illo-px/py`
 * (0 -> 1 across the tile, 0.5 = centre) on the enclosing tile; the scenes read
 * the derived, centred `--ds-illo-mx/my` to lean toward the cursor. Skipped under
 * reduced motion — the art still blooms to colour, just without the lean.
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

    const recentre = () => {
      pending = null;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      tile.style.setProperty("--ds-illo-px", "0.5");
      tile.style.setProperty("--ds-illo-py", "0.5");
    };

    // Bind to the query (not a one-time read) so a mid-session reduced-motion
    // toggle takes effect. `matchMedia` is guarded for jsdom under test.
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
  // The mask fades the art out across the text band so copy never fights it.
  illoLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    // `, 0.5` fallback centres these before the first pointer event, so the
    // default needs no `@property` registration.
    "--ds-illo-mx": "calc((var(--ds-illo-px, 0.5) - 0.5) * 2)",
    "--ds-illo-my": "calc((var(--ds-illo-py, 0.5) - 0.5) * 2)",
    maskImage:
      "radial-gradient(125% 140% at 100% 100%, #000 44%, rgba(0, 0, 0, 0.5) 66%, transparent 85%)",
    WebkitMaskImage:
      "radial-gradient(125% 140% at 100% 100%, #000 44%, rgba(0, 0, 0, 0.5) 66%, transparent 85%)",
  },
});
