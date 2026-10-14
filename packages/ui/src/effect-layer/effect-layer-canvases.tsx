import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { absoluteFill, viewportAnchor } from "../primitives/layout.stylex.ts";
import { layer } from "../tokens.stylex.ts";
import {
  createEffectLayer,
  type EffectCanvasNeeds,
} from "./create-effect-layer.ts";
import type { EffectRegistry } from "./create-effect-registry.ts";
import { debugEffect } from "./debug-effect.ts";
import { effectsForRoles } from "./effects-for-roles.ts";
import type { EffectDevice } from "./request-effect-device.ts";

interface EffectLayerCanvasesProps {
  gpu: EffectDevice;
  registry: EffectRegistry;
  /** Every role that some registered element has. */
  roles: number;
  debug: boolean;
}

const NO_CANVASES: EffectCanvasNeeds = { scroll: false, fixed: false };

/**
 * The `<canvas>` elements of the effect layer: two on the effect plane over
 * the page's content, which take turns to cover the document while it
 * scrolls, and one fixed to the viewport over every other plane. They are inert, so every pointer,
 * hit test and text selection goes through to the content under them. Each
 * group mounts only while a registered element with a role needs it; the
 * debug view needs both.
 *
 * @internal
 */
export function EffectLayerCanvases({
  gpu,
  registry,
  roles,
  debug,
}: EffectLayerCanvasesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLCanvasElement>(null);
  const secondRef = useRef<HTMLCanvasElement>(null);
  const fixedRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<ReturnType<typeof createEffectLayer>>(null);
  const [needs, setNeeds] = useState(NO_CANVASES);
  const hasScroll = debug || needs.scroll;
  const hasFixed = debug || needs.fixed;

  useEffect(() => {
    const container = containerRef.current;
    const probe = probeRef.current;
    if (container === null || probe === null) {
      return;
    }
    const effectLayer = createEffectLayer(gpu, {
      registry,
      container,
      probe,
      onCanvasNeedsChange: setNeeds,
    });
    layerRef.current = effectLayer;
    return () => {
      effectLayer.destroy();
      layerRef.current = null;
    };
  }, [gpu, registry]);

  useEffect(() => {
    const first = firstRef.current;
    const second = secondRef.current;
    layerRef.current?.setCanvases({
      scroll: first && second ? [first, second] : [],
      fixed: fixedRef.current,
    });
  }, [gpu, registry, hasScroll, hasFixed]);

  useEffect(() => {
    layerRef.current?.setEffects([
      ...(debug ? [debugEffect] : []),
      ...effectsForRoles(roles),
    ]);
  }, [gpu, registry, debug, roles]);

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden
        inert
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
        <div aria-hidden inert css={[viewportAnchor.fixed, styles.plane]}>
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
    zIndex: layer.effect,
  },
  plane: {
    pointerEvents: "none",
    zIndex: layer.fixedEffect,
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
