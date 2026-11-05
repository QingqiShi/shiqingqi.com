import { useEffect, useRef, useState, type RefObject } from "react";
import type { CellPixels, Transform } from "./types";

const MIN_SCALE = 1;
const MAX_SCALE = 64;

export function useCanvasViewport(present: CellPixels) {
  const [transform, setTransform] = useState<Transform | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Canvas size tracks the container so the cell can be panned around inside
  // the wrapper at varying zoom without having to grow the canvas itself.
  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Auto-fit transform when container or cell shape changes and there's no
  // user transform yet. Stored-deps pattern.
  const fitTransform = ((): Transform | null => {
    if (containerSize.width === 0 || containerSize.height === 0) return null;
    const sx = Math.floor(containerSize.width / present.width);
    const sy = Math.floor(containerSize.height / present.height);
    const fit = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(sx, sy)));
    return {
      scale: fit,
      panX: Math.floor((containerSize.width - present.width * fit) / 2),
      panY: Math.floor((containerSize.height - present.height * fit) / 2),
    };
  })();

  const [prevFitKey, setPrevFitKey] = useState<string | null>(null);
  const fitKey =
    fitTransform === null
      ? null
      : `${String(containerSize.width)}x${String(containerSize.height)}@${String(present.width)}x${String(present.height)}`;
  if (fitKey !== prevFitKey && fitTransform !== null) {
    setPrevFitKey(fitKey);
    if (transform === null) setTransform(fitTransform);
  }

  const fitToView = () => {
    if (fitTransform !== null) setTransform(fitTransform);
  };

  return { transform, setTransform, containerRef, containerSize, fitToView };
}

export function useWheelZoom(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  transform: Transform | null,
  setTransform: (next: Transform) => void,
) {
  // Wheel zoom — native non-passive listener so preventDefault stops the page
  // from scrolling.
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const onWheel = (event: WheelEvent) => {
      const current = transformRef.current;
      if (current === null) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      // Integer scale steps so pixels stay crisp.
      const dir = event.deltaY < 0 ? 1 : -1;
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, current.scale + dir),
      );
      if (nextScale === current.scale) return;
      const px = (cx - current.panX) / current.scale;
      const py = (cy - current.panY) / current.scale;
      setTransform({
        scale: nextScale,
        panX: cx - px * nextScale,
        panY: cy - py * nextScale,
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [canvasRef, setTransform]);
}
