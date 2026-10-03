"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useIsHydrated } from "../hooks/use-is-hydrated.ts";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { readEffectLayerMode } from "./read-effect-layer-mode.ts";
import {
  requestEffectDevice,
  type EffectDevice,
} from "./request-effect-device.ts";
import type { Effect, EffectCanvas, EffectUse } from "./types.ts";

const EffectLayerCanvases = lazy(() =>
  import("./effect-layer-canvases.tsx").then((module) => ({
    default: module.EffectLayerCanvases,
  })),
);

let forcedColorsQuery: MediaQueryList | null = null;

function getForcedColorsQuery() {
  forcedColorsQuery ??= window.matchMedia("(forced-colors: active)");
  return forcedColorsQuery;
}

function subscribeToForcedColors(onChange: () => void) {
  const query = getForcedColorsQuery();
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

/**
 * The shared device, requested the first time the layer is wanted. A lost
 * device is replaced once; after a second loss the layer stays off.
 */
function useEffectLayerDevice(wanted: boolean) {
  const [gpu, setGpu] = useState<EffectDevice | null>(null);
  const [failed, setFailed] = useState(false);
  const lossCountRef = useRef(0);

  useEffect(() => {
    if (!wanted || gpu !== null || failed) {
      return;
    }
    let cancelled = false;
    void requestEffectDevice().then((next) => {
      if (cancelled) {
        next?.device.destroy();
      } else if (next === null) {
        setFailed(true);
      } else {
        setGpu(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [wanted, gpu, failed]);

  useEffect(() => {
    if (gpu === null) {
      return;
    }
    let current = true;
    void gpu.device.lost.then((info) => {
      if (!current || info.reason === "destroyed") {
        return;
      }
      lossCountRef.current += 1;
      setGpu(null);
      if (lossCountRef.current > 1) {
        setFailed(true);
      }
    });
    return () => {
      current = false;
    };
  }, [gpu]);

  return gpu;
}

interface EffectLayerProviderProps {
  /**
   * The page, rendered in front of the effect layer's `<canvas>` elements.
   *
   * @zh 页面内容，渲染在效果层的 `<canvas>` 元素之前。
   */
  children: ReactNode;
}

/**
 * Draws effects with WebGPU on `<canvas>` elements behind all content. It
 * mounts no `<canvas>` element and requests no GPU device until an effect is
 * added. Without WebGPU, under forced colours, with `?effects=off` or with the
 * `effect-layer` localStorage key set to `off`, it renders only its children.
 * `?effects=debug` shows the bands the scroll `<canvas>` elements cover.
 *
 * Mount it once, high in the page, inside a positioned `<body>` so that the
 * scroll `<canvas>` elements cover the document and no more.
 */
export function EffectLayerProvider({ children }: EffectLayerProviderProps) {
  const [uses, setUses] = useState<readonly EffectUse[]>([]);
  const register = useCallback((effect: Effect, canvas: EffectCanvas) => {
    const use = { effect, canvas };
    setUses((current) => [...current, use]);
    return () => {
      setUses((current) => current.filter((item) => item !== use));
    };
  }, []);

  const hydrated = useIsHydrated();
  const mode = useMemo(
    () => (hydrated ? readEffectLayerMode() : "off"),
    [hydrated],
  );
  const forcedColors = useSyncExternalStore(
    subscribeToForcedColors,
    () => getForcedColorsQuery().matches,
    () => false,
  );
  const debug = mode === "debug";
  const wanted = mode !== "off" && !forcedColors && (debug || uses.length > 0);
  const gpu = useEffectLayerDevice(wanted);

  return (
    <EffectLayerContext value={register}>
      {children}
      {wanted && gpu !== null && (
        <Suspense fallback={null}>
          <EffectLayerCanvases gpu={gpu} uses={uses} debug={debug} />
        </Suspense>
      )}
    </EffectLayerContext>
  );
}
