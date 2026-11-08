import { useRef, useState } from "react";
import type { SceneBox } from "#src/pet/scene-svg.ts";

/** A phone's scene, which the server draws at. The client measures the real box on mount. */
const SERVER_BOX: SceneBox = { width: 390, height: 320, topInset: 0 };

/**
 * The size of the scene's box, and how far the phone's status bar reaches into it. Put `sceneRef`
 * on the box and `insetRef` on an empty child whose height is the top safe-area inset.
 */
export function useSceneBox() {
  const [box, setBox] = useState(SERVER_BOX);
  const insetRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = (node: HTMLElement | null) => {
    if (node === null) return;
    const observer = new ResizeObserver(([entry]) => {
      setBox({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
        topInset: Math.round(
          insetRef.current?.getBoundingClientRect().height ?? 0,
        ),
      });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  };

  return { box, sceneRef, insetRef };
}
