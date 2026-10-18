import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { absoluteFill, viewportAnchor } from "../primitives/layout.stylex.ts";
import { layer } from "../tokens.stylex.ts";
import { createEffectLayer } from "./create-effect-layer.ts";
import type { EffectRegistry } from "./create-effect-registry.ts";
import { debugEffect } from "./debug-effect.ts";
import { effectsForRoles } from "./effects-for-roles.ts";
import type { EffectCanvasNeeds } from "./plan-scopes.ts";
import type { EffectDevice } from "./request-effect-device.ts";

interface EffectLayerCanvasesProps {
  gpu: EffectDevice;
  registry: EffectRegistry;
  /** Every role that some registered element has. */
  roles: number;
  debug: boolean;
}

const NO_CANVASES: EffectCanvasNeeds = {
  page: false,
  fixed: false,
  fixedBottom: false,
  regions: [],
};

type EffectLayer = ReturnType<typeof createEffectLayer>;

interface RegionCanvasesProps {
  id: number;
  onCanvases: (id: number, canvases: HTMLCanvasElement[] | null) => void;
}

/**
 * The two scroll `<canvas>` elements of one Scroll region. A portal puts
 * them at the end of the region's content box, so they scroll with it, and
 * they cover that box and no more.
 */
function RegionCanvases({ id, onCanvases }: RegionCanvasesProps) {
  const firstRef = useRef<HTMLCanvasElement>(null);
  const secondRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const first = firstRef.current;
    const second = secondRef.current;
    if (first === null || second === null) {
      return;
    }
    onCanvases(id, [first, second]);
    return () => {
      onCanvases(id, null);
    };
  }, [id, onCanvases]);
  return (
    <div aria-hidden inert css={[absoluteFill.all, styles.document]}>
      <canvas ref={firstRef} data-effect-layer="region" css={styles.canvas} />
      <canvas ref={secondRef} data-effect-layer="region" css={styles.canvas} />
    </div>
  );
}

/**
 * The `<canvas>` elements of the effect layer: two on the effect plane over
 * the page's content, which take turns to cover the document while it
 * scrolls; two in the content box of each Scroll region, which take turns
 * to cover that box while the region scrolls; and two fixed to the viewport
 * over every other plane: one from its top edge, and one from its bottom
 * edge, for elements fixed to that edge, which a mobile toolbar moves. They
 * are inert, so every pointer, hit test and text selection goes through to
 * the content under them. Each group mounts only while a registered element
 * with a role needs it; the debug view needs all of the page and the
 * viewport.
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
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const fixedBottomRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<EffectLayer>(null);
  const [regionCanvases] = useState(
    () => new Map<number, HTMLCanvasElement[]>(),
  );
  const [needs, setNeeds] = useState(NO_CANVASES);
  const hasPage = debug || needs.page;
  const hasFixed = debug || needs.fixed;
  const hasFixedBottom = debug || needs.fixedBottom;

  useEffect(() => {
    const container = containerRef.current;
    const probe = probeRef.current;
    const bottomAnchor = bottomAnchorRef.current;
    if (container === null || probe === null || bottomAnchor === null) {
      return;
    }
    const effectLayer = createEffectLayer(gpu, {
      registry,
      container,
      probe,
      bottomAnchor,
      onCanvasNeedsChange: setNeeds,
    });
    layerRef.current = effectLayer;
    // The region canvases mount before this effect runs, so give them to
    // each new layer here.
    for (const [id, canvases] of regionCanvases) {
      effectLayer.setRegionCanvases(id, canvases);
    }
    return () => {
      effectLayer.destroy();
      layerRef.current = null;
    };
  }, [gpu, registry, regionCanvases]);

  useEffect(() => {
    const first = firstRef.current;
    const second = secondRef.current;
    layerRef.current?.setCanvases({
      page: first && second ? [first, second] : [],
      fixed: fixedRef.current,
      fixedBottom: fixedBottomRef.current,
    });
  }, [gpu, registry, hasPage, hasFixed, hasFixedBottom]);

  useEffect(() => {
    layerRef.current?.setEffects([
      ...(debug ? [debugEffect] : []),
      ...effectsForRoles(roles),
    ]);
  }, [gpu, registry, debug, roles]);

  const [onRegionCanvases] = useState(
    () => (id: number, canvases: HTMLCanvasElement[] | null) => {
      if (canvases === null) {
        regionCanvases.delete(id);
      } else {
        regionCanvases.set(id, canvases);
      }
      layerRef.current?.setRegionCanvases(id, canvases);
    },
  );

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden
        inert
        css={[absoluteFill.all, styles.document]}
      >
        <div ref={probeRef} css={styles.probe} />
        {hasPage && (
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
      {needs.regions.map(({ id, content }) =>
        createPortal(
          <RegionCanvases id={id} onCanvases={onRegionCanvases} />,
          content,
          String(id),
        ),
      )}
      {hasFixed && (
        <div aria-hidden inert css={[viewportAnchor.fixed, styles.plane]}>
          <canvas
            ref={fixedRef}
            data-effect-layer="fixed"
            css={styles.canvas}
          />
        </div>
      )}
      <div
        ref={bottomAnchorRef}
        aria-hidden
        inert
        css={[viewportAnchor.fixed, styles.bottomAnchor, styles.plane]}
      >
        {hasFixedBottom && (
          <canvas
            ref={fixedBottomRef}
            data-effect-layer="fixed-bottom"
            css={styles.bottomCanvas}
          />
        )}
      </div>
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
  bottomAnchor: {
    insetBlockStart: "auto",
    insetBlockEnd: 0,
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
  bottomCanvas: {
    position: "absolute",
    bottom: 0,
    left: 0,
    display: "block",
  },
});
