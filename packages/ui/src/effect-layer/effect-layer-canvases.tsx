import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { absoluteFill, viewportAnchor } from "../primitives/layout.stylex.ts";
import { layer } from "../tokens.stylex.ts";
import { createEffectLayer } from "./create-effect-layer.ts";
import type { EffectRegistry } from "./create-effect-registry.ts";
import { debugEffect } from "./debug-effect.ts";
import { effectsForRoles } from "./effects-for-roles.ts";
import type { EffectDevice } from "./request-effect-device.ts";
import type { CarrierKey } from "./resolve-carrier.ts";
import type { CanvasNeed } from "./types.ts";

interface EffectLayerCanvasesProps {
  gpu: EffectDevice;
  registry: EffectRegistry;
  /** Every role that some registered element has. */
  roles: number;
  debug: boolean;
}

const NO_CANVASES: readonly CanvasNeed[] = [];

type EffectLayer = ReturnType<typeof createEffectLayer>;

type OnCanvases = (
  carrier: CarrierKey,
  canvases: HTMLCanvasElement[] | null,
) => void;

interface CarrierCanvasesProps {
  carrier: CarrierKey;
  /** Two scroll `<canvas>` elements, or one for the viewport. */
  count: 1 | 2;
  /** The value of `data-effect-layer` on each `<canvas>` element. */
  name: string;
  /** Holds the `<canvas>` element at the bottom edge of its box. */
  bottom?: boolean;
  onCanvases: OnCanvases;
}

/** The `<canvas>` elements of one carrier, which it gives to `onCanvases`. */
function CarrierCanvases({
  carrier,
  count,
  name,
  bottom = false,
  onCanvases,
}: CarrierCanvasesProps) {
  const firstRef = useRef<HTMLCanvasElement>(null);
  const secondRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    onCanvases(
      carrier,
      [firstRef.current, secondRef.current].filter((canvas) => canvas !== null),
    );
    return () => {
      onCanvases(carrier, null);
    };
  }, [carrier, onCanvases]);
  const css = bottom ? styles.bottomCanvas : styles.canvas;
  return (
    <>
      <canvas ref={firstRef} data-effect-layer={name} css={css} />
      {count === 2 && (
        <canvas ref={secondRef} data-effect-layer={name} css={css} />
      )}
    </>
  );
}

/**
 * The `<canvas>` elements of the effect layer: two on the effect plane over
 * the page's content, which take turns to cover the document while it
 * scrolls; two in the content box of each Scroll region, which a portal puts
 * at the end of that box, so that they scroll with it and take turns to
 * cover it; and two fixed to the viewport over every other plane: one from
 * its top edge, and one from its bottom edge, for elements fixed to that
 * edge, which a mobile toolbar moves. They are inert, so every pointer, hit
 * test and text selection goes through to the content under them. Each
 * group mounts only while a registered element with a role needs it; the
 * debug view needs all of the page and the viewport.
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
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<EffectLayer>(null);
  const [mounted] = useState(() => new Map<CarrierKey, HTMLCanvasElement[]>());
  const [needs, setNeeds] = useState(NO_CANVASES);
  const has = (key: CarrierKey) =>
    debug || needs.some((need) => need.key === key);

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
    // The canvases mount before this effect runs, so give them to each new
    // layer here.
    for (const [key, canvases] of mounted) {
      effectLayer.setCanvases(key, canvases);
    }
    return () => {
      effectLayer.destroy();
      layerRef.current = null;
    };
  }, [gpu, registry, mounted]);

  useEffect(() => {
    layerRef.current?.setEffects([
      ...(debug ? [debugEffect] : []),
      ...effectsForRoles(roles),
    ]);
  }, [gpu, registry, debug, roles]);

  const [onCanvases] = useState((): OnCanvases => (key, canvases) => {
    if (canvases === null) {
      mounted.delete(key);
    } else {
      mounted.set(key, canvases);
    }
    layerRef.current?.setCanvases(key, canvases);
  });

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden
        inert
        css={[absoluteFill.all, styles.document]}
      >
        <div ref={probeRef} css={styles.probe} />
        {has("page") && (
          <CarrierCanvases
            carrier="page"
            count={2}
            name="scroll"
            onCanvases={onCanvases}
          />
        )}
      </div>
      {needs.flatMap(({ key, content }) =>
        content === null
          ? []
          : [
              createPortal(
                <div
                  aria-hidden
                  inert
                  css={[absoluteFill.all, styles.document]}
                >
                  <CarrierCanvases
                    carrier={key}
                    count={2}
                    name="region"
                    onCanvases={onCanvases}
                  />
                </div>,
                content,
                String(key),
              ),
            ],
      )}
      {has("fixed") && (
        <div aria-hidden inert css={[viewportAnchor.fixed, styles.plane]}>
          <CarrierCanvases
            carrier="fixed"
            count={1}
            name="fixed"
            onCanvases={onCanvases}
          />
        </div>
      )}
      <div
        ref={bottomAnchorRef}
        aria-hidden
        inert
        css={[viewportAnchor.fixed, styles.bottomAnchor, styles.plane]}
      >
        {has("fixedBottom") && (
          <CarrierCanvases
            carrier="fixedBottom"
            count={1}
            name="fixed-bottom"
            bottom
            onCanvases={onCanvases}
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
