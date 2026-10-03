import * as stylex from "@stylexjs/stylex";
import { useEffect, useMemo, useRef } from "react";
import { absoluteFill, viewportAnchor } from "../primitives/layout.stylex.ts";
import { layer } from "../tokens.stylex.ts";
import { createEffectLayer } from "./create-effect-layer.ts";
import { debugEffect } from "./debug-effect.ts";
import type { EffectDevice } from "./request-effect-device.ts";
import type { EffectUse } from "./types.ts";

interface EffectLayerCanvasesProps {
  gpu: EffectDevice;
  uses: readonly EffectUse[];
  debug: boolean;
}

/**
 * The `<canvas>` elements of the effect layer, behind all content: two that
 * take turns to cover the document while it scrolls, and one fixed to the
 * viewport. Each group mounts only while a use needs it; the debug view needs
 * both.
 *
 * @internal
 */
export function EffectLayerCanvases({
  gpu,
  uses,
  debug,
}: EffectLayerCanvasesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLCanvasElement>(null);
  const secondRef = useRef<HTMLCanvasElement>(null);
  const fixedRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<ReturnType<typeof createEffectLayer>>(null);
  const hasScroll = debug || uses.some((use) => use.canvas === "scroll");
  const hasFixed = debug || uses.some((use) => use.canvas === "fixed");
  const effects = useMemo(
    () => [
      ...new Set([
        ...(debug ? [debugEffect] : []),
        ...uses.map((use) => use.effect),
      ]),
    ],
    [debug, uses],
  );

  useEffect(() => {
    const container = containerRef.current;
    const probe = probeRef.current;
    if (container === null || probe === null) {
      return;
    }
    const effectLayer = createEffectLayer(gpu, container, probe);
    layerRef.current = effectLayer;
    return () => {
      effectLayer.destroy();
      layerRef.current = null;
    };
  }, [gpu]);

  useEffect(() => {
    const first = firstRef.current;
    const second = secondRef.current;
    layerRef.current?.setCanvases({
      scroll: first && second ? [first, second] : [],
      fixed: fixedRef.current,
    });
  }, [gpu, hasScroll, hasFixed]);

  useEffect(() => {
    layerRef.current?.setEffects(effects);
  }, [gpu, effects]);

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden
        css={[absoluteFill.all, styles.document]}
      >
        <div ref={probeRef} css={styles.probe} />
        {hasScroll && (
          <>
            <canvas
              ref={firstRef}
              data-effect-layer="scroll"
              css={styles.canvas}
            />
            <canvas
              ref={secondRef}
              data-effect-layer="scroll"
              css={styles.canvas}
            />
          </>
        )}
      </div>
      {hasFixed && (
        <div aria-hidden css={[viewportAnchor.fixed, styles.behindContent]}>
          <canvas
            ref={fixedRef}
            data-effect-layer="fixed"
            css={styles.canvas}
          />
        </div>
      )}
    </>
  );
}

const styles = stylex.create({
  document: {
    overflow: "clip",
    contain: "strict",
    pointerEvents: "none",
    zIndex: layer.background,
  },
  behindContent: {
    pointerEvents: "none",
    zIndex: layer.background,
  },
  probe: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 0,
    height: "100lvh",
    visibility: "hidden",
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    display: "block",
  },
});
